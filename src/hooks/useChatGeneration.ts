import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateResponseWithMemory } from "@/actions/generateAIResponse";
import { saveChatServer } from "@/actions/serverHistory";
import { readStreamableValue } from "@ai-sdk/rsc";
import { ChatType } from "@/types/ChatType";
import { validateContentWithToast } from "@/utils/contentGuard";
import debounce from "lodash/debounce";
import {
  MAX_WORDS_IN_CONTEXT,
  MAX_STREAMED_CHARS,
  TRUNCATION_NOTICE,
  STREAMING_UPDATE_INTERVAL_MS,
} from "@/constants";
import useProfileStore from "@/zustand/useProfileStore";
import toast from "react-hot-toast";
import { usePaywallStore } from "@/zustand/usePaywallStore";
import { CREDITS_COSTS } from "@/constants/credits";
import { ROUTES } from "@/constants/routes";
import { useShallow } from "zustand/react/shallow";
import type { AiModelKey } from "@/ai/models";
import { calculateWordCount } from "@/utils/messages";
import { isInsufficientCreditsError } from "@/utils/errors";
import { createClientIdempotencyKey } from "@/utils/clientIdempotencyKey";

interface GenerationConfig {
  useCredits: boolean;
  modelKey: AiModelKey;
  openaiApiKey: string;
  anthropicApiKey: string;
  xaiApiKey: string;
  googleApiKey: string;
}

/**
 * Trims chat history to a word budget, keeping the MOST RECENT pairs.
 * `chatlist` comes newest-first from Firestore; we walk in that order and
 * unshift to preserve chronological order for the model.
 */
function pickRecentContext(chatlist: ChatType[], budget: number): ChatType[] {
  const kept: ChatType[] = [];
  let wordCount = 0;
  for (const chat of chatlist) {
    const words = calculateWordCount(chat.prompt) + calculateWordCount(chat.response);
    if (wordCount + words > budget) break;
    kept.unshift(chat);
    wordCount += words;
  }
  return kept;
}

export function useChatGeneration(
  uid: string,
  chatlist: ChatType[],
  onResponseSaved: () => void,
  scrollToBottom: () => void
) {
  const generationConfig = useProfileStore(
    useShallow(
      (s): GenerationConfig => ({
        useCredits: s.profile.useCredits ?? true,
        modelKey: s.profile.text_model,
        openaiApiKey: s.profile.openai_api_key ?? "",
        anthropicApiKey: s.profile.anthropic_api_key ?? "",
        xaiApiKey: s.profile.xai_api_key ?? "",
        googleApiKey: s.profile.google_api_key ?? "",
      })
    )
  );

  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  const {
    useCredits,
    modelKey,
    openaiApiKey,
    anthropicApiKey,
    xaiApiKey,
    googleApiKey,
  } = generationConfig;
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [pendingPrompt, setPendingPrompt] = useState<string>("");
  const [streamedResponse, setStreamedResponse] = useState<string>("");
  const [loadingResponse, setLoadingResponse] = useState(false);

  // Mounted ref so we can safely no-op state updates after unmount.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Prevent concurrent submits (double-Enter, rapid button clicks).
  const isSubmittingRef = useRef(false);

  const getContextWithMemory = useCallback(
    (list: ChatType[]): ChatType[] => pickRecentContext(list, MAX_WORDS_IN_CONTEXT),
    []
  );

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
    if (isSubmittingRef.current) return;
    if (!newPrompt.trim()) return;
    if (!validateContentWithToast(newPrompt)) return;

    isSubmittingRef.current = true;

    const promptToSend = newPrompt.trim();
    setPendingPrompt(promptToSend);
    setNewPrompt("");
    setLoadingResponse(true);
    setStreamedResponse("");

    const systemPrompt =
      "The user will ask you questions. Respond in a helpful way.";
    const context = getContextWithMemory(chatlist);

    context.push({
      id: `${Date.now()}`,
      prompt: promptToSend,
      response: "",
      seconds: Math.floor(Date.now() / 1000),
    });

    setTimeout(scrollToBottom, 50);

    let finishedSummary = "";
    try {
      const result = await generateResponseWithMemory(systemPrompt, context, {
        modelKey,
        useCredits,
        openaiApiKey,
        anthropicApiKey,
        xaiApiKey,
        googleApiKey,
        idempotencyKey: createClientIdempotencyKey(),
      });
      let lastUiUpdate = 0;

      for await (const content of readStreamableValue(result)) {
        if (!isMountedRef.current) break;
        if (content === undefined || content === null) continue;
        finishedSummary = String(content).trim();
        if (finishedSummary.length > MAX_STREAMED_CHARS) {
          finishedSummary =
            finishedSummary.slice(0, MAX_STREAMED_CHARS) + TRUNCATION_NOTICE;
          if (isMountedRef.current) setStreamedResponse(finishedSummary);
          break;
        }
        const now = Date.now();
        if (now - lastUiUpdate > STREAMING_UPDATE_INTERVAL_MS) {
          lastUiUpdate = now;
          if (isMountedRef.current) {
            setStreamedResponse(finishedSummary);
            debouncedScrollToBottom();
          }
        }
      }

      if (isMountedRef.current) setStreamedResponse(finishedSummary);

      if (uid && finishedSummary) {
        try {
          await saveChatServer(promptToSend, finishedSummary);
          onResponseSaved();
        } catch (saveError) {
          console.error("Failed to save chat:", saveError);
          toast.error("Message sent but couldn't be saved to history.");
        }
      }

      if (useCredits) {
        await fetchProfile();
      }
    } catch (error) {
      if (isInsufficientCreditsError(error)) {
        toast.error("Not enough credits. Please buy more credits in Account.");
        usePaywallStore.getState().openPaywall({
          actionLabel: "Chat message",
          requiredCredits: CREDITS_COSTS.chatMessage,
          redirectPath: ROUTES.chat,
        });
      } else if (
        error instanceof Error &&
        (error.message === "DUPLICATE_REQUEST" ||
          error.message === "REQUEST_IN_PROGRESS")
      ) {
        toast.error(
          "That chat request is already being handled. Please wait a moment."
        );
      } else {
        console.error("Error generating response:", error);
        toast.error("Couldn't generate a response. Please try again.");
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) {
        setLoadingResponse(false);
        setPendingPrompt("");
      }
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
