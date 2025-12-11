import { useState } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import { generateResponseWithMemory } from "@/actions/generateAIResponse";
import { readStreamableValue } from "@ai-sdk/rsc";
import { ChatType } from "@/types/ChatType";
import {
  checkRestrictedWords,
  isIOSReactNativeWebView,
} from "@/utils/platform";
import { debounce } from "lodash";
import { MAX_WORDS_IN_CONTEXT } from "@/constants";

export function useChatGeneration(
  uid: string,
  chatlist: ChatType[],
  onResponseSaved: () => void,
  scrollToBottom: () => void
) {
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [pendingPrompt, setPendingPrompt] = useState<string>(""); // Track the message being processed
  const [streamedResponse, setStreamedResponse] = useState<string>("");
  const [loadingResponse, setLoadingResponse] = useState(false);

  // Collect past interactions for memory (up to the word limit)
  const getContextWithMemory = (chatlist: ChatType[]): ChatType[] => {
    const context: ChatType[] = [];
    let wordCount = 0;

    for (let i = 0; i < chatlist.length; i++) {
      const chat = chatlist[i];
      const promptWords = chat.prompt.split(" ").length;
      const responseWords = chat.response.split(" ").length;

      if (wordCount + promptWords + responseWords <= MAX_WORDS_IN_CONTEXT) {
        context.push(chat);
        wordCount += promptWords + responseWords;
      } else {
        break;
      }
    }

    return context;
  };

  const debouncedScrollToBottom = debounce(scrollToBottom, 100);

  const handleSendPrompt = async () => {
    if (!newPrompt.trim()) return;
    if (isIOSReactNativeWebView() && checkRestrictedWords(newPrompt)) {
      alert("Your description contains restricted words and cannot be used.");
      return;
    }

    // Store the prompt being sent so it can be displayed immediately
    const promptToSend = newPrompt.trim();
    setPendingPrompt(promptToSend);
    setNewPrompt(""); // Clear input immediately for better UX
    setLoadingResponse(true);
    setStreamedResponse("");

    const systemPrompt =
      "The user will ask you questions. Respond in a helpful way.";
    const context = getContextWithMemory(chatlist);

    // Add current prompt to context
    context.push({
      id: `${Date.now()}`,
      prompt: promptToSend,
      response: "",
      seconds: Math.floor(Date.now() / 1000),
    });

    // Scroll to show the user's message immediately
    setTimeout(scrollToBottom, 50);

    try {
      const result = await generateResponseWithMemory(systemPrompt, context);
      let finishedSummary = "";

      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          setStreamedResponse(finishedSummary);
          debouncedScrollToBottom();
        }
      }

      await saveChat(promptToSend, finishedSummary);

      onResponseSaved();
      setLoadingResponse(false);
      setPendingPrompt(""); // Clear pending prompt after save
    } catch (error) {
      console.error("Error generating response:", error);
      setLoadingResponse(false);
      setPendingPrompt(""); // Clear on error too
    }
  };

  // Save the prompt and response to Firestore (standardized path: users/{uid}/chats)
  const saveChat = async (prompt: string, response: string) => {
    if (uid) {
      await addDoc(collection(db, "users", uid, "chats"), {
        prompt,
        response,
        timestamp: Timestamp.now(),
      });
    }
  };

  return {
    newPrompt,
    setNewPrompt,
    pendingPrompt,
    streamedResponse,
    loadingResponse,
    handleSendPrompt,
  };
}
