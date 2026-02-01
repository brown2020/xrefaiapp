import { useEffect, useMemo, useState, useCallback } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import { generateResponseWithMemory } from "@/actions/generateAIResponse";
import { readStreamableValue } from "@ai-sdk/rsc";
import { ChatType } from "@/types/ChatType";
import { validateContentWithToast } from "@/utils/contentGuard";
import debounce from "lodash/debounce";
import { MAX_WORDS_IN_CONTEXT } from "@/constants";
import useProfileStore from "@/zustand/useProfileStore";
import toast from "react-hot-toast";
import { usePaywallStore } from "@/zustand/usePaywallStore";
import { CREDITS_COSTS } from "@/constants/credits";
import { ROUTES } from "@/constants/routes";
import { useShallow } from "zustand/react/shallow";
import type { AiModelKey } from "@/ai/models";

/**
 * Configuration needed for chat generation
 * Using a single memoized selector prevents race conditions between individual field subscriptions
 */
interface GenerationConfig {
  useCredits: boolean;
  modelKey: AiModelKey;
  openaiApiKey: string;
  anthropicApiKey: string;
  xaiApiKey: string;
  googleApiKey: string;
}

export function useChatGeneration(
  uid: string,
  chatlist: ChatType[],
  onResponseSaved: () => void,
  scrollToBottom: () => void
) {
  // Use a single memoized selector to get all generation-related config at once
  // This prevents race conditions where individual fields might be read at different times
  const generationConfig = useProfileStore(
    useShallow((s): GenerationConfig => ({
      useCredits: s.profile.useCredits ?? true,
      modelKey: s.profile.text_model,
      openaiApiKey: s.profile.openai_api_key ?? "",
      anthropicApiKey: s.profile.anthropic_api_key ?? "",
      xaiApiKey: s.profile.xai_api_key ?? "",
      googleApiKey: s.profile.google_api_key ?? "",
    }))
  );

  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  // Destructure for easier access
  const {
    useCredits,
    modelKey,
    openaiApiKey,
    anthropicApiKey,
    xaiApiKey,
    googleApiKey,
  } = generationConfig;
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [pendingPrompt, setPendingPrompt] = useState<string>(""); // Track the message being processed
  const [streamedResponse, setStreamedResponse] = useState<string>("");
  const [loadingResponse, setLoadingResponse] = useState(false);

  // Collect past interactions for memory (newest first from Firestore, then order chronologically)
  // Memoized with useCallback to prevent recreation on every render
  const getContextWithMemory = useCallback((chatlist: ChatType[]): ChatType[] => {
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

    return context.reverse();
  }, []); // No dependencies - pure function based on input

  const debouncedScrollToBottom = useMemo(
    () => debounce(scrollToBottom, 100),
    [scrollToBottom]
  );

  useEffect(() => {
    return () => {
      debouncedScrollToBottom.cancel();
    };
  }, [debouncedScrollToBottom]);

  const handleSendPrompt = async () => {
    if (!newPrompt.trim()) return;
    if (!validateContentWithToast(newPrompt)) {
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
      const result = await generateResponseWithMemory(systemPrompt, context, {
        modelKey,
        useCredits,
        openaiApiKey,
        anthropicApiKey,
        xaiApiKey,
        googleApiKey,
      });
      const MAX_STREAMED_CHARS = 12000;
      const TRUNCATION_NOTICE = "\n\n[Response truncated due to length]";
      let finishedSummary = "";
      let lastUiUpdate = 0;

      for await (const content of readStreamableValue(result)) {
        if (content !== undefined && content !== null) {
          finishedSummary = String(content).trim();
          if (finishedSummary.length > MAX_STREAMED_CHARS) {
            finishedSummary =
              finishedSummary.slice(0, MAX_STREAMED_CHARS) + TRUNCATION_NOTICE;
            setStreamedResponse(finishedSummary);
            break;
          }
          const now = Date.now();
          if (now - lastUiUpdate > 120) {
            lastUiUpdate = now;
            setStreamedResponse(finishedSummary);
            debouncedScrollToBottom();
          }
        }
      }
      setStreamedResponse(finishedSummary);

      await saveChat(promptToSend, finishedSummary);

      onResponseSaved();
      if (useCredits) {
        await fetchProfile();
      }
      setLoadingResponse(false);
      setPendingPrompt(""); // Clear pending prompt after save
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "INSUFFICIENT_CREDITS" ||
          error.message.toLowerCase().includes("insufficient"))
      ) {
        toast.error("Not enough credits. Please buy more credits in Account.");
        usePaywallStore.getState().openPaywall({
          actionLabel: "Chat message",
          requiredCredits: CREDITS_COSTS.chatMessage,
          redirectPath: ROUTES.chat,
        });
        setLoadingResponse(false);
        setPendingPrompt("");
        return;
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
