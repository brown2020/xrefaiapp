"use client";

import { useState } from "react";
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
import { MIN_WORD_COUNT, MAX_WORD_COUNT } from "@/constants";
import useProfileStore from "@/zustand/useProfileStore";
import { getTextGenerationCreditsCost } from "@/constants/credits";
import { usePaywallStore } from "@/zustand/usePaywallStore";
import { ROUTES } from "@/constants/routes";

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
  const profile = useProfileStore((s) => s.profile);
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
  const [words, setWords] = useState("30");

  useScrollToResult(summary, flagged);

  const getResponse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateContentWithToast(inputValue)) {
      return;
    }

    let wordnum = Number(words || "30");
    if (wordnum < MIN_WORD_COUNT) wordnum = MIN_WORD_COUNT;
    if (wordnum > MAX_WORD_COUNT) wordnum = MAX_WORD_COUNT;

    const newPrompt = promptBuilder(inputValue, wordnum);
    let finishedSummary = "";
    const cost = getTextGenerationCreditsCost(wordnum);

    startGeneration();

    try {
      const result = await generateResponse(systemPrompt, newPrompt, {
        modelKey: profile.text_model,
        useCredits: profile.useCredits,
        requestedWordCount: wordnum,
        openaiApiKey: profile.openai_api_key,
        anthropicApiKey: profile.anthropic_api_key,
        xaiApiKey: profile.xai_api_key,
        googleApiKey: profile.google_api_key,
      });
      let chunkCount = 0;

      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          chunkCount++;
          const currentProgress = 20 + (chunkCount / wordnum) * 80;
          setProgress(Math.min(currentProgress, 95));
        }
      }

      completeWithSuccess(finishedSummary);
      if (profile.useCredits) {
        await fetchProfile();
      }

      if (uid) {
        const topicDisplay =
          inputValue.length > 50
            ? inputValue.substring(0, 50) + "..."
            : inputValue;
        await saveHistory({
          prompt: newPrompt,
          response: finishedSummary,
          topic: topicDisplay,
          words,
          xrefs: [],
        });
      }

      toast.success(`${title} generated successfully`);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "INSUFFICIENT_CREDITS" ||
          error.message.toLowerCase().includes("insufficient"))
      ) {
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
              defaultValue="30"
              type="number"
              id="words-field"
              placeholder="Enter number of words."
              onChange={(e) => setWords(e.target.value || "30")}
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
