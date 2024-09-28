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
import Image from "next/image";
import TextareaAutosize from "react-textarea-autosize";
import xrefchat from "@/app/assets/logo512.png";
import xrefchat_t from "@/app/assets/logo512.png";
import { db } from "@/firebase/firebaseClient";
import { useAuthStore } from "@/zustand/useAuthStore";
import { ChatType } from "@/types/ChatType";
import { readStreamableValue } from "ai/rsc";
import { generateResponseWithMemory } from "@/actions/generateResponseWithMemory";

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
    <div className="flex flex-col items-center justify-center p-0 space-y-5 sm:p-5">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="rounded-xl bg-orange-500 h-52 w-52">
          <Image
            className="object-contain p-3 rounded-xl w-52 h-52 invert"
            src={xrefchat_t}
            alt="logo"
            width={208}
            height={208}
          />
        </div>

        <div>XrefChat AI</div>
      </div>

      <div className="flex flex-col w-full h-full space-y-4">
        {/* New Prompt Input */}
        <TextareaAutosize
          className="px-3 py-2 whitespace-pre-wrap border rounded-md outline-none resize-none h-fit form-input"
          placeholder="Ask me anything!"
          minRows={2}
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
        />
        <button
          onClick={handleSendPrompt}
          className="px-5 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={loadingResponse || !newPrompt.trim()}
        >
          {loadingResponse ? "Generating..." : "Send"}
        </button>

        {/* Streaming Response (if currently generating) */}
        {loadingResponse && (
          <div className="p-2 text-black whitespace-pre-wrap rounded-md bg-gray-300">
            {streamedResponse || "Generating response..."}
          </div>
        )}

        {/* Display chat list */}
        {chatlist.map((chat, index) => (
          <div key={index} className="flex flex-col w-full mb-3 space-y-3">
            <div className="flex justify-end w-full pl-20 ml-auto space-x-2 text-left">
              <div className="p-2 text-black whitespace-pre-wrap rounded-md bg-gray-300">
                {chat.response}
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500">
                <Image
                  src={xrefchat}
                  alt="bot"
                  className="flex-shrink-0 object-contain w-10 h-10 rounded-full invert"
                  width={40}
                  height={40}
                />
              </div>
            </div>
            <div className="flex justify-start w-full pr-20 mr-auto space-x-2 text-left">
              <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 text-xs font-bold text-white rounded-full bg-blue-500">
                You
              </div>
              <div className="p-2 text-black whitespace-pre-wrap rounded-md bg-blue-300">
                {chat.prompt}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load more button if needed */}
      {lastKey && (
        <button
          onClick={loadMoreChats}
          disabled={loadingMore}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
