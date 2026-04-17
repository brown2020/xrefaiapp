"use client";

import { useEffect, useRef, useState } from "react";
import { generateResponse } from "@/actions/generateAIResponse";
import { readStreamableValue } from "@ai-sdk/rsc";
import toast from "react-hot-toast";
import { validateContentWithToast } from "@/utils/contentGuard";
import { useHistorySaver } from "@/hooks/useHistorySaver";
import { useScrollToResult } from "@/hooks/useScrollToResult";
import { useGenerationState } from "@/hooks/useGenerationState";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ResponseDisplay } from "@/components/ui/ResponseDisplay";
import {
  MIN_WORD_COUNT,
  MAX_WORD_COUNT,
  MAX_STREAMED_CHARS,
  TRUNCATION_NOTICE,
  DEFAULT_WORD_COUNT,
} from "@/constants";
import useProfileStore from "@/zustand/useProfileStore";
import { getTextGenerationCreditsCost } from "@/constants/credits";
import { usePaywallStore } from "@/zustand/usePaywallStore";
import { ROUTES } from "@/constants/routes";
import { useShallow } from "zustand/react/shallow";
import { isInsufficientCreditsError } from "@/utils/errors";
import { createClientIdempotencyKey } from "@/utils/clientIdempotencyKey";

export interface BasePromptProps {
  title: string;
  systemPrompt: string;
  promptBuilder: (inputValue: string, wordCount: number) => string;
  buttonText?: string;
  loadingText?: string;
  showWordCount?: boolean;
  children: (props: {
    inputValue: string;
    setInputValue: (value: string) => void;
    active: boolean;
  }) => React.ReactNode;
}

export default function BasePrompt({
  title,
  systemPrompt,
  promptBuilder,
  buttonText = "Generate",
  loadingText = "Working",
  showWordCount = true,
  children,
}: BasePromptProps) {
  const generationConfig = useProfileStore(
    useShallow((s) => ({
      useCredits: s.profile.useCredits,
      textModel: s.profile.text_model,
      openaiApiKey: s.profile.openai_api_key,
      anthropicApiKey: s.profile.anthropic_api_key,
      xaiApiKey: s.profile.xai_api_key,
      googleApiKey: s.profile.google_api_key,
    }))
  );
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const openPaywall = usePaywallStore((s) => s.openPaywall);
  const { saveHistory, uid } = useHistorySaver();
  const {
    summary,
    flagged,
    active,
    thinking,
    progress,
    startGeneration,
    completeWithSuccess,
    completeWithError,
    setProgress,
  } = useGenerationState();

  const [inputValue, setInputValue] = useState("");
  const [words, setWords] = useState(String(DEFAULT_WORD_COUNT));

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useScrollToResult(summary, flagged);

  const getResponse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateContentWithToast(inputValue)) return;

    const parsed = Number.parseFloat(words || String(DEFAULT_WORD_COUNT));
    const wordnum = Number.isFinite(parsed)
      ? Math.min(
          MAX_WORD_COUNT,
          Math.max(MIN_WORD_COUNT, Math.floor(parsed))
        )
      : DEFAULT_WORD_COUNT;

    const newPrompt = promptBuilder(inputValue, wordnum);
    let finishedSummary = "";
    const cost = getTextGenerationCreditsCost(wordnum);

    startGeneration();

    try {
      const result = await generateResponse(systemPrompt, newPrompt, {
        modelKey: generationConfig.textModel,
        useCredits: generationConfig.useCredits,
        requestedWordCount: wordnum,
        openaiApiKey: generationConfig.openaiApiKey,
        anthropicApiKey: generationConfig.anthropicApiKey,
        xaiApiKey: generationConfig.xaiApiKey,
        googleApiKey: generationConfig.googleApiKey,
        idempotencyKey: createClientIdempotencyKey(),
      });
      let chunkCount = 0;

      for await (const content of readStreamableValue(result)) {
        if (!isMountedRef.current) break;
        if (!content) continue;
        finishedSummary = content.trim();
        if (finishedSummary.length > MAX_STREAMED_CHARS) {
          finishedSummary =
            finishedSummary.slice(0, MAX_STREAMED_CHARS) + TRUNCATION_NOTICE;
          break;
        }
        chunkCount++;
        const currentProgress = 20 + (chunkCount / wordnum) * 80;
        setProgress(Math.min(currentProgress, 95));
      }

      if (!isMountedRef.current) return;

      completeWithSuccess(finishedSummary);
      if (generationConfig.useCredits) {
        await fetchProfile();
      }

      if (uid) {
        const topicDisplay =
          inputValue.length > 50 ? inputValue.substring(0, 50) + "..." : inputValue;
        try {
          await saveHistory({
            prompt: newPrompt,
            response: finishedSummary,
            topic: topicDisplay,
            words,
            xrefs: [],
          });
        } catch (saveError) {
          console.error("Failed to save history:", saveError);
          toast.error("Generated successfully but couldn't save to history.");
        }
      }

      toast.success(`${title} generated successfully`);
    } catch (error) {
      if (isInsufficientCreditsError(error)) {
        toast.error(
          `Not enough credits (need ${cost}). Please buy more credits in Account.`
        );
        openPaywall({
          actionLabel: title,
          requiredCredits: cost,
          redirectPath: ROUTES.tools,
        });
        completeWithError("Not enough credits");
        return;
      }
      if (
        error instanceof Error &&
        (error.message === "DUPLICATE_REQUEST" ||
          error.message === "REQUEST_IN_PROGRESS")
      ) {
        toast.error(
          "That request is already being handled. Please wait a moment."
        );
        completeWithError("Duplicate request");
        return;
      }
      completeWithError(
        "No suggestions found. Servers might be overloaded right now."
      );
      console.error("Error generating response:", error);
      toast.error(`Failed to generate ${title.toLowerCase()}`);
    }
  };

  return (
    <div className="form-wrapper">
      <form onSubmit={getResponse}>
        {children({ inputValue, setInputValue, active })}

        {showWordCount && (
          <label htmlFor="words-field" className={labelClassName}>
            Approximate number of words (Between {MIN_WORD_COUNT} and{" "}
            {MAX_WORD_COUNT})
            <input
              className={inputClassName}
              defaultValue={String(DEFAULT_WORD_COUNT)}
              type="number"
              id="words-field"
              min={MIN_WORD_COUNT}
              max={MAX_WORD_COUNT}
              placeholder="Enter number of words."
              onChange={(e) =>
                setWords(e.target.value || String(DEFAULT_WORD_COUNT))
              }
            />
          </label>
        )}

        <div className="mt-6">
          {thinking && <ProgressBar progress={progress} />}

          <SubmitButton
            isLoading={thinking}
            disabled={!active || !inputValue.trim()}
            loadingText={loadingText}
          >
            {buttonText}
          </SubmitButton>
        </div>

        <ResponseDisplay flagged={flagged} summary={summary} />
      </form>
    </div>
  );
}
