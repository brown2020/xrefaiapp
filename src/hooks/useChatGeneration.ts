import { useState } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import { generateResponseWithMemory } from "@/actions/generateAIResponse";
import { readStreamableValue } from "@ai-sdk/rsc";
import { ChatType } from "@/types/ChatType";
import { validateContentWithToast } from "@/utils/contentGuard";
import { debounce } from "lodash";
import { MAX_WORDS_IN_CONTEXT } from "@/constants";
import useProfileStore from "@/zustand/useProfileStore";
import toast from "react-hot-toast";
import { CREDITS_COSTS } from "@/constants/credits";

export function useChatGeneration(
  uid: string,
  chatlist: ChatType[],
  onResponseSaved: () => void,
  scrollToBottom: () => void
) {
  // Subscribe only to fields required to generate (avoid re-renders on credit changes).
  const useCredits = useProfileStore((s) => s.profile.useCredits);
  const modelKey = useProfileStore((s) => s.profile.text_model);
  const openaiApiKey = useProfileStore((s) => s.profile.openai_api_key);
  const anthropicApiKey = useProfileStore((s) => s.profile.anthropic_api_key);
  const xaiApiKey = useProfileStore((s) => s.profile.xai_api_key);
  const googleApiKey = useProfileStore((s) => s.profile.google_api_key);
  const minusCredits = useProfileStore((s) => s.minusCredits);
  const addCredits = useProfileStore((s) => s.addCredits);
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
    if (!validateContentWithToast(newPrompt)) {
      return;
    }

    let charged = false;
    if (useCredits) {
      const cost = CREDITS_COSTS.chatMessage;
      const ok = await minusCredits(cost);
      if (!ok) {
        const currentCredits = useProfileStore.getState().profile.credits;
        toast.error(
          `Not enough credits (${Math.round(
            currentCredits
          )} available, need ${cost}). Please buy more credits in Account.`
        );
        return;
      }
      charged = true;
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
      const result = await generateResponseWithMemory(systemPrompt, context, {
        modelKey,
        useCredits,
        openaiApiKey,
        anthropicApiKey,
        xaiApiKey,
        googleApiKey,
      });
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
      // Refund reserved credits if generation fails.
      if (charged) {
        await addCredits(CREDITS_COSTS.chatMessage);
      }
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
