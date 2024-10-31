"use client";

import {
  collection,
  addDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { db } from "@/firebase/firebaseClient";
import { useAuthStore } from "@/zustand/useAuthStore";
import { ChatType } from "@/types/ChatType";
import { readStreamableValue } from "ai/rsc";
import { generateResponseWithMemory } from "@/actions/generateResponseWithMemory";
import Image from "next/image";
import RootLayout from "@/app/layout";
import ScrollToBottom from 'react-scroll-to-bottom';
import MarkdownRenderer from "@/components/MarkdownRenderer";
import useProfileStore from "@/zustand/useProfileStore";
import { debounce } from "lodash";
import { copyToClipboard } from "@/utils/copyToClipboard";

const MAX_WORDS_IN_CONTEXT = 5000; // Adjust based on OpenAI model limits

export default function Chat() {
  const [chatlist, setChatlist] = useState<ChatType[]>([]);
  const [lastKey, setLastKey] = useState<Timestamp | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [newPrompt, setNewPrompt] = useState<string>(""); // Input field state
  const [streamedResponse, setStreamedResponse] = useState<string>(""); // Streaming response state
  const [responseSaved, setResponseSaved] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const maxLoad = 30;
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const uid = useAuthStore((s) => s.uid);
  const profile = useProfileStore((s) => s.profile);
  const [loading, setLoading] = useState(true);  // Add loading state


  // Effect to track scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        // Check if the user is near the bottom (e.g., within 50 pixels)
        if (scrollHeight - scrollTop - clientHeight > 50) {
          setIsButtonVisible(true);
        } else {
          setIsButtonVisible(false);
        }
      }
    };

    const chatContainer = chatContainerRef.current;
    chatContainer?.addEventListener("scroll", handleScroll);

    return () => {
      chatContainer?.removeEventListener("scroll", handleScroll);
    };
  }, [chatlist]);

  // Initial load of chat messages from Firebase
  useEffect(() => {
    if (uid) {
      const getChatlist = () => {
        const q = query(
          collection(db, "profiles", uid, "xrefchat"),
          orderBy("timestamp", "desc"),
          limit(maxLoad)
        );

        const unsub = onSnapshot(q, (querySnapshot) => {
          const chats: ChatType[] = [];
          let lastKey: Timestamp | undefined = undefined;

          querySnapshot.forEach((doc) => {
            if (doc.exists()) {
              const data = doc.data();
              chats.push({
                id: data?.id || doc.id,
                prompt: data?.prompt,
                response: data?.response,
                seconds: data?.timestamp.seconds,
              });

              if (chats.length === maxLoad) {
                lastKey = doc.data()?.timestamp || undefined;
              }
            }
          });

          setChatlist(chats);
          setLoading(false);
          // scrollToBottom();
          setTimeout(() => {
            scrollToBottomWithoutSmooth();
          }, 100);
          setLastKey(lastKey);

          if (responseSaved) {
            setStreamedResponse(""); // Clear the streamed response
            setResponseSaved(false); // Reset the flag
          }
        });

        return () => unsub();
      };

      getChatlist();
    }
  }, [uid, responseSaved]);

  // Load more messages (pagination)
  const loadMoreChats = async () => {
    if (uid && lastKey) {
      setLoadingMore(true);
      const q = query(
        collection(db, "profiles", uid, "xrefchat"),
        orderBy("timestamp", "desc"),
        startAfter(lastKey),
        limit(maxLoad)
      );

      const querySnapshot = await getDocs(q);
      const newChats: ChatType[] = [];
      let newLastKey: Timestamp | undefined = undefined;

      querySnapshot.forEach((doc) => {
        if (doc.exists()) {
          const data = doc.data();
          newChats.push({
            id: data?.id || doc.id,
            prompt: data?.prompt,
            response: data?.response,
            seconds: data?.timestamp.seconds,
          });

          if (newChats.length === maxLoad) {
            newLastKey = doc.data()?.timestamp || undefined;
          }
        }
      });

      setChatlist((prevChats) => [...prevChats, ...newChats]);
      setLastKey(newLastKey);
      setLoadingMore(false);
    }
  };

  // Collect past interactions for memory (up to the word limit)
  const getContextWithMemory = (chatlist: ChatType[]): ChatType[] => {
    const context: ChatType[] = [];
    let wordCount = 0;

    // Traverse chatlist from newest to oldest to accumulate past interactions
    for (let i = 0; i < chatlist.length; i++) {
      const chat = chatlist[i];
      const promptWords = chat.prompt.split(" ").length;
      const responseWords = chat.response.split(" ").length;

      if (wordCount + promptWords + responseWords <= MAX_WORDS_IN_CONTEXT) {
        context.push(chat); // Add entire ChatType to the context
        wordCount += promptWords + responseWords;
      } else {
        break; // Stop adding if the word count exceeds the limit
      }
    }

    return context; // Return the collected chat history
  };
  const debouncedScrollToBottom = debounce(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, 100);

  // Handle sending a new prompt
  const handleSendPrompt = async () => {
    if (!newPrompt.trim()) return;

    setLoadingResponse(true);
    setStreamedResponse(""); // Reset the streamed response
    setResponseSaved(false); // Reset the response saved flag

    const systemPrompt =
      "The user will ask you questions. Respond in a helpful way.";

    const context: ChatType[] = getContextWithMemory(chatlist); // Get the past chat history (ChatType[])

    // Add the new prompt as a ChatType entry (prompt is the user's message, response is empty for now)
    context.push({
      id: `${new Date().getTime()}`, // Temporary ID for new message
      prompt: newPrompt,
      response: "",
      seconds: Math.floor(Date.now() / 1000),
    });

    try {
      // Send the raw chatlist (ChatType[]) to the server action
      const result = await generateResponseWithMemory(systemPrompt, context);
      let finishedSummary = "";

      // Handle streaming response with async iterator
      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          setStreamedResponse(finishedSummary);
          debouncedScrollToBottom(); // Directly update state with the latest content chunk
        }
      }

      // Once the response is complete, save it to Firestore
      await saveChat(newPrompt, finishedSummary);

      setResponseSaved(true); // Set response as saved
      setLoadingResponse(false);
      setNewPrompt(""); // Clear input field
    } catch (error) {
      console.error("Error generating response:", error);
      setLoadingResponse(false);
    }
  };

  // Save the prompt and response to Firestore
  const saveChat = async (prompt: string, response: string) => {
    if (uid) {
      await addDoc(collection(db, "profiles", uid, "xrefchat"), {
        prompt,
        response,
        timestamp: Timestamp.now(),
      });
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToBottomWithoutSmooth = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView();
    }
  };

  return (
    <RootLayout showFooter={false}>

      <div className="relative flex flex-col items-center container mx-auto justify-center p-0 space-y-5 sm:p-5 sm:pb-0">

        {/* Load more button if needed */}
        {
          lastKey && (
            <button
              onClick={loadMoreChats}
              disabled={loadingMore}
              className="w-44 text-white px-3 py-2 custom-write bottom bg-[#192449] !opacity-100 hover:bg-[#83A873] !rounded-3xl font-bold transition-transform duration-300 ease-in-out"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )
        }

        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <p>Loading chat...</p>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full space-y-4 chat-bord-main ">
            <ScrollToBottom className="scroll-to-bottom" initialScrollBehavior="smooth">
              <div className="flex flex-col">

                {/* Display chat list */}
                {chatlist.slice().reverse().map((chat, index) => (
                  <div key={index} className="flex flex-col my-3 space-y-3">
                    <div className="flex justify-end max-w-5xl ml-auto rounded-xl gap-4 items-center p-4 text-right bg-[#F0F6FF]">
                      <div className="text-[#A1ADF4] whitespace-pre-wrap rounded-md">
                        <p className="text-[#041D34] font-bold">You</p>
                        <p className="break-word text-[#0B3C68] font-normal">{chat.prompt}</p>
                      </div>
                      <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 text-xs font-bold text-white rounded-full bg-blue-500">
                        {/* You */}
                        <Image src={profile.photoUrl} alt="" height={100} width={100} className="object-cover rounded-full" />
                      </div>
                    </div>
                    <div className="flex flex-col max-w-5xl p-4 gap-4 rounded-xl text-left bg-[#E7EAEF]">
                      <div className="flex w-full gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0A0F20]">
                          <Image
                            src="/logo(X).png"
                            alt="bot"
                            className="flex-shrink-0 object-contain w-10 h-10 rounded-full px-[5px]"
                            width={40}
                            height={40}
                          />
                        </div>
                        <div className="w-full flex justify-between items-center mb-2">
                          <div className="flex gap-3 items-center">
                            <h3 className="m-0 text-[#041D34] font-bold">XREF.AI</h3>
                            <p className="px-[10px] py-0 text-[12px] rounded-[10px] bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] text-white ">Bot</p>
                          </div>
                          <button className="copy_icon p-2 ml-3 w-9 h-9 border border-[#A3AEC0] rounded-[10px] text-center flex justify-center items-center cursor-pointer hover:bg-[#83A873]"
                          onClick={() => copyToClipboard(chat.response)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0" y="0" viewBox="0 0 48 48" className="">
                              <g>
                                <path d="M33.46 28.672V7.735c0-2.481-2.019-4.5-4.5-4.5H8.023a4.505 4.505 0 0 0-4.5 4.5v20.937c0 2.481 2.019 4.5 4.5 4.5H28.96c2.481 0 4.5-2.019 4.5-4.5zm-26.937 0V7.735c0-.827.673-1.5 1.5-1.5H28.96c.827 0 1.5.673 1.5 1.5v20.937c0 .827-.673 1.5-1.5 1.5H8.023c-.827 0-1.5-.673-1.5-1.5zm33.454-13.844h-3.646a1.5 1.5 0 1 0 0 3h3.646c.827 0 1.5.673 1.5 1.5v20.937c0 .827-.673 1.5-1.5 1.5H19.041c-.827 0-1.5-.673-1.5-1.5v-4.147a1.5 1.5 0 1 0-3 0v4.147c0 2.481 2.019 4.5 4.5 4.5h20.936c2.481 0 4.5-2.019 4.5-4.5V19.328c0-2.481-2.019-4.5-4.5-4.5z" fill="#000000" opacity="1" data-original="#000000" className="fill-[#7F8CA1]">
                                </path>
                              </g>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="text-[#0B3C68] whitespace-pre-wrap w-full text-section-ai pb-4">
                        <MarkdownRenderer content={chat.response} />
                      </div>
                    </div>
                  </div>
                ))}
                {loadingResponse && (
                  <div className="max-w-5xl p-2 bg-[#E7EAEF] text-[#0B3C68] whitespace-pre-wrap rounded-md text-section-ai">
                    <div className="flex mb-2 gap-4">
                      <div className="flex gap-3 items-center">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0A0F20]">
                          <Image
                            src="/logo(X).png"
                            alt="bot"
                            className="flex-shrink-0 object-contain w-10 h-10 rounded-full px-[5px]"
                            width={40}
                            height={40}
                          />
                        </div>
                        <h3 className="m-0 text-[#0B3C68] font-bold">XREF.AI</h3>
                        <p className="px-[10px] py-0 text-[12px] rounded-[10px] bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] text-white ">Bot</p>
                      </div>
                    </div>
                    <MarkdownRenderer content={streamedResponse || "Generating response..."} />
                  </div>
                )}
              </div>
              <div ref={scrollRef} />
            </ScrollToBottom>
            <div className="sticky bottom-0 rounded-md">
              <div className="relative bg-[#ffffff] pt-4">
                {/* Input field */}
                <TextareaAutosize
                  className="text_area w-full px-3 py-4 rounded-lg bg-[#ffffff] text-[#0B3C68] outline-none textarea placeholder-[#BBBEC9]"
                  placeholder="Ask me anything!"
                  minRows={2}
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && newPrompt.trim()) {
                      e.preventDefault(); // Prevents adding a newline
                      handleSendPrompt();
                    }
                  }}
                />

                {/* Button */}
                <button
                  onClick={handleSendPrompt}
                  className={`absolute right-4 bottom-6 px-5 py-3 text-[#ffffff] bg-[#39509E] rounded-md transition-opacity duration-200 ${loadingResponse || !newPrompt.trim() ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg hover:transition-all"
                    }`}
                  disabled={loadingResponse || !newPrompt.trim()}
                  aria-label="Send prompt"
                >
                  {loadingResponse ? "Generating..." : <i className="fa-regular fa-paper-plane"></i>}
                </button>
              </div>
            </div>

          </div>
        )}
        {isButtonVisible && (
          <button
            onClick={scrollToBottom}
            className="cursor-pointer fixed z-10 rounded-full bg-clip-padding right-1/2 bottom-32 translate-x-1/2 lg:right-1/2 lg:bottom-32 xl:right-16 xl:bottom-12 text-white bg-[#02C173] w-10 h-10 flex items-center justify-center "
          >
            <i className="fa-solid fa-arrow-down"></i>
          </button>
        )}
      </div>

    </RootLayout>

  );
}
