"use client";

import { useState } from "react";
import { generateResponse } from "@/actions/generateAIResponse";
import { readStreamableValue } from "@ai-sdk/rsc";
import toast from "react-hot-toast";
import { validateContentWithToast } from "@/utils/contentGuard";
import { useHistorySaver } from "@/hooks/useHistorySaver";
import { useWebsiteScraper } from "@/hooks/useWebsiteScraper";
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
} from "@/constants";
import useProfileStore from "@/zustand/useProfileStore";
import { usePaywallStore } from "@/zustand/usePaywallStore";
import { getTextGenerationCreditsCost } from "@/constants/credits";
import { ROUTES } from "@/constants/routes";
import { useShallow } from "zustand/react/shallow";
import { isInsufficientCreditsError } from "@/utils/errors";
import { createClientIdempotencyKey } from "@/utils/clientIdempotencyKey";

export default function SummarizeTopic() {
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
  const { scrapeWebsite, resetProgress } = useWebsiteScraper();
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

  const [topic, setTopic] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [words, setWords] = useState("30");

  useScrollToResult(summary, flagged);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateContentWithToast(topic || siteUrl)) return;

    const wordsParsed = Number.parseFloat(words || "30");
    const wordnum = Number.isFinite(wordsParsed)
      ? Math.min(
          MAX_WORD_COUNT,
          Math.max(MIN_WORD_COUNT, Math.floor(wordsParsed))
        )
      : 30;

    startGeneration();
    resetProgress();

    let scrapedContent = "";
    if (siteUrl) {
      // Scrape BEFORE starting generation so a failure doesn't debit credits.
      setProgress(30);
      scrapedContent = await scrapeWebsite(siteUrl);
      if (!scrapedContent && !topic) {
        completeWithError(
          "Couldn't read that website. Try again or add a focus topic."
        );
        return;
      }
      setProgress(60);
    }

    const newPrompt = siteUrl && scrapedContent
      ? `Summarize this topic based on the content from the website ${siteUrl} in approximately ${wordnum} words: ${scrapedContent}`
      : `Summarize this topic in approximately ${wordnum} words: ${topic}`;

    const systemPrompt = "Summarize this topic";
    let finishedSummary = "";
    const cost = getTextGenerationCreditsCost(wordnum);

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
        if (!content) continue;
        finishedSummary = content.trim();
        if (finishedSummary.length > MAX_STREAMED_CHARS) {
          finishedSummary =
            finishedSummary.slice(0, MAX_STREAMED_CHARS) + TRUNCATION_NOTICE;
          break;
        }
        chunkCount++;
        setProgress(Math.min(70 + (chunkCount / wordnum) * 30, 95));
      }

      completeWithSuccess(finishedSummary);
      if (generationConfig.useCredits) {
        await fetchProfile();
      }

      if (uid) {
        await saveHistory({
          prompt: newPrompt,
          response: finishedSummary,
          topic: topic || siteUrl,
          words,
          xrefs: [],
        });
      }

      toast.success("Summary generated successfully");
    } catch (error) {
      if (isInsufficientCreditsError(error)) {
        toast.error(
          `Not enough credits (need ${cost}). Please buy more credits in Account.`
        );
        openPaywall({
          actionLabel: "Website summary",
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
      toast.error("Failed to generate summary");
    }
  };

  return (
    <div className="form-wrapper">
      <form onSubmit={handleSubmit}>
        <label htmlFor="site1-field" className={labelClassName}>
          Website reference
          <input
            className={inputClassName}
            type="text"
            id="site1-field"
            maxLength={120}
            placeholder="Website URL to use as a reference."
            onChange={(e) => setSiteUrl(e.target.value)}
            required
          />
        </label>

        <label htmlFor="topic-field" className={labelClassName}>
          Focus (Optional)
          <input
            className={inputClassName}
            type="text"
            id="topic-field"
            maxLength={80}
            placeholder="Enter a specific focus or aspect to summarize (optional)."
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>

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

        <div className="mt-6">
          {thinking && <ProgressBar progress={progress} />}

          <SubmitButton
            isLoading={thinking}
            disabled={!active || !siteUrl.trim()}
            loadingText="Summarizing"
          >
            Summarize Website
          </SubmitButton>
        </div>

        <ResponseDisplay flagged={flagged} summary={summary} />
      </form>
    </div>
  );
}
