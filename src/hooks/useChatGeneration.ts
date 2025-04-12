import { useState } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import { generateResponseWithMemory } from "@/actions/generateResponseWithMemory";
import { readStreamableValue } from "ai/rsc";
import { ChatType } from "@/types/ChatType";
import {
  checkRestrictedWords,
  isIOSReactNativeWebView,
} from "@/utils/platform";
import { debounce } from "lodash";

const MAX_WORDS_IN_CONTEXT = 5000;

export function useChatGeneration(
  uid: string,
  chatlist: ChatType[],
  onResponseSaved: () => void,
  scrollToBottom: () => void
) {
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [streamedResponse, setStreamedResponse] = useState<string>("");
  const [loadingResponse, setLoadingResponse] = useState(false);

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
        context.push(chat);
        wordCount += promptWords + responseWords;
      } else {
        break;
      }
    }

    return context;
  };

  const debouncedScrollToBottom = debounce(scrollToBottom, 100);

  // Handle sending a new prompt
  const handleSendPrompt = async () => {
    if (!newPrompt.trim()) return;
    if (isIOSReactNativeWebView() && checkRestrictedWords(newPrompt)) {
      alert("Your description contains restricted words and cannot be used.");
      return;
    }

    setLoadingResponse(true);
    setStreamedResponse("");

    const systemPrompt =
      "The user will ask you questions. Respond in a helpful way.";

    const context: ChatType[] = getContextWithMemory(chatlist);

    context.push({
      id: `${new Date().getTime()}`,
      prompt: newPrompt,
      response: "",
      seconds: Math.floor(Date.now() / 1000),
    });

    try {
      const result = await generateResponseWithMemory(systemPrompt, context);
      let finishedSummary = "";

      // Handle streaming response with async iterator
      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          setStreamedResponse(finishedSummary);
          debouncedScrollToBottom();
        }
      }

      // Once the response is complete, save it to Firestore
      await saveChat(newPrompt, finishedSummary);

      onResponseSaved();
      setLoadingResponse(false);
      setNewPrompt("");
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

  return {
    newPrompt,
    setNewPrompt,
    streamedResponse,
    loadingResponse,
    handleSendPrompt,
  };
}
