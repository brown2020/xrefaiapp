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
import { useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { db } from "@/firebase/firebaseClient";
import { useAuthStore } from "@/zustand/useAuthStore";
import { ChatType } from "@/types/ChatType";
import { readStreamableValue } from "ai/rsc";
import { generateResponseWithMemory } from "@/actions/generateResponseWithMemory";
import Image from "next/image";

const MAX_WORDS_IN_CONTEXT = 5000; // Adjust based on OpenAI model limits

export default function Chat() {
  const [chatlist, setChatlist] = useState<ChatType[]>([]);
  const [lastKey, setLastKey] = useState<Timestamp | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [newPrompt, setNewPrompt] = useState<string>(""); // Input field state
  const [streamedResponse, setStreamedResponse] = useState<string>(""); // Streaming response state
  const [responseSaved, setResponseSaved] = useState<boolean>(false); // Track if response is saved
  const maxLoad = 30;

  const uid = useAuthStore((state) => state.uid);

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
          setStreamedResponse(finishedSummary); // Directly update state with the latest content chunk
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

  return (
    <div className="relative flex flex-col items-center container mx-auto justify-center p-0 space-y-5 sm:p-5">
      <div className="flex flex-col w-full h-full space-y-4 chat-bord-main">
        <div className="flex flex-col-reverse">
          {loadingResponse && (
            <div className="p-2 bg-[#293A74]  text-[#A1ADF4] whitespace-pre-wrap rounded-md">
              {streamedResponse || "Generating response..."}
            </div>
          )}

          {/* Display chat list */}
          {chatlist.map((chat, index) => (
            <div key={index} className="flex flex-col w-full mb-3 space-y-3">
              <div className="flex justify-end w-full flex-row-reverse p-4  ml-auto gap-4 rounded-xl text-left bg-[#293A74]">
                <div className="text-[#A1ADF4] whitespace-pre-wrap w-full text-section-ai">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex gap-3 items-center">
                      <h3 className="m-0 text-white font-semibold">XEEF.AI</h3>
                      <p className="px-[10px] py-0 text-[12px] rounded-[10px] bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] text-white">Bot</p>
                    </div>
                    <p className="p-1 w-8 h-8 border border-[#4863BE] rounded-[10px] text-center flex justify-center items-center cursor-pointer">
                      <i className="fa-regular fa-copy text-white text-base"></i>
                    </p>
                  </div>
                  <p className="md:break-normal break-words">{chat.response}</p>

                </div>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0A0F20]">
                  <Image
                    src="/logo(X).png"
                    alt="bot"
                    className="flex-shrink-0 object-contain w-10 h-10 rounded-full px-[5px]"
                    width={40}
                    height={40}
                  />
                </div>
              </div>
              <div className="flex justify-start w-full  mr-auto rounded-xl gap-4 items-center p-4 text-left bg-[#192449]">
                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 text-xs font-bold text-white rounded-full bg-blue-500">
                  {/* You */}
                  <Image src="/Ellipse 4.png" alt="" height={100} width={100}/>
                </div>
                <div className="text-[#A1ADF4] whitespace-pre-wrap rounded-md">
                  <p className="text-white ">You</p>
                  <p className="break-word">{chat.prompt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 rounded-md">
          <div className="relative bg-[#0A0F20] pt-4">
            {/* Input field */}
            <TextareaAutosize
              className="text_area w-full px-3 py-4 rounded-lg bg-[#131C3C] text-white outline-none textarea placeholder-[#585E70]"
              placeholder="Ask me anything!"
              minRows={2}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />


            {/* Button */}
            <button
              onClick={handleSendPrompt}
              className={`absolute right-4 bottom-6	px-5 py-3 text-white bg-[#333C5B] rounded-md transition-opacity duration-200 ${loadingResponse || !newPrompt.trim() ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4A5272] hover:shadow-lg"
                }`}
              disabled={loadingResponse || !newPrompt.trim()}
              aria-label="Send prompt"
            >
              {loadingResponse ? "Generating..." : <i className="fa-regular fa-paper-plane"></i>}
            </button>
          </div>
        </div>
      </div>


      {/* scroll bottom */}
      <button className="cursor-pointer fixed z-10 rounded-full bg-[#02C173] text-white right-12 bottom-28 bg-token-main-surface-primary w-8 h-8 flex items-center justify-center ">
        <i className="fa-solid fa-angle-down"></i>
      </button>

      {/* Load more button if needed */}
      {
        lastKey && (
          <button
            onClick={loadMoreChats}
            disabled={loadingMore}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )
      }
    </div >
  );
}
