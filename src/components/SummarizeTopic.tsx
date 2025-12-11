"use client";

import { useState } from "react";
import { generateResponse } from "@/actions/generateAIResponse";
import { readStreamableValue } from "@ai-sdk/rsc";
import toast from "react-hot-toast";
import { validateContentWithAlert } from "@/utils/contentGuard";
import { useHistorySaver } from "@/hooks/useHistorySaver";
import { useWebsiteScraper } from "@/hooks/useWebsiteScraper";
import { useScrollToResult } from "@/hooks/useScrollToResult";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ResponseDisplay } from "@/components/ui/ResponseDisplay";
import { MIN_WORD_COUNT, MAX_WORD_COUNT } from "@/constants";

export default function SummarizeTopic() {
  const { saveHistory, uid } = useHistorySaver();
  const { scrapeWebsite, progress, setProgress, resetProgress } =
    useWebsiteScraper();

  const [summary, setSummary] = useState("");
  const [flagged, setFlagged] = useState("");
  const [active, setActive] = useState(true);
  const [thinking, setThinking] = useState(false);

  const [topic, setTopic] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [words, setWords] = useState("30");

  useScrollToResult(summary, flagged);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateContentWithAlert(topic)) {
      return;
    }

    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);
    resetProgress();

    let wordnum = Number(words || "30");
    if (wordnum < MIN_WORD_COUNT) wordnum = MIN_WORD_COUNT;
    if (wordnum > MAX_WORD_COUNT) wordnum = MAX_WORD_COUNT;

    let newPrompt = "Summarize this topic";
    let scrapedContent = "";

    if (siteUrl) {
      scrapedContent = await scrapeWebsite(siteUrl);
      if (scrapedContent) {
        newPrompt += ` based on the content from the website ${siteUrl}`;
        newPrompt += ` in approximately ${wordnum} words: ${scrapedContent}`;
      } else {
        newPrompt += ` in approximately ${wordnum} words: ${topic}`;
      }
    } else {
      newPrompt += ` in approximately ${wordnum} words: ${topic}`;
    }

    const systemPrompt = "Summarize this topic";
    let finishedSummary = "";

    try {
      const result = await generateResponse(systemPrompt, newPrompt);
      let chunkCount = 0;

      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          setSummary(finishedSummary);
          chunkCount++;
          setProgress(70 + (chunkCount / wordnum) * 30);
        }
      }

      setThinking(false);

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
      setThinking(false);
      setFlagged(
        "No suggestions found. Servers might be overloaded right now."
      );
      console.error("Error generating response:", error);
      toast.error("Failed to generate summary");
    } finally {
      setProgress(100);
      setActive(true);
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
