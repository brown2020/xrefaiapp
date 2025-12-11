"use client";

import { useState } from "react";
import { copyToClipboard } from "@/utils/clipboard";
import { generateResponse } from "@/actions/generateAIResponse";
import { readStreamableValue } from "@ai-sdk/rsc";
import axios from "axios";
import { load } from "cheerio";
import toast from "react-hot-toast";
import {
  checkRestrictedWords,
  isIOSReactNativeWebView,
} from "@/utils/platform";
import { useHistorySaver } from "@/hooks/useHistorySaver";
import { useScrollToResult } from "@/hooks/useScrollToResult";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MIN_WORD_COUNT, MAX_WORD_COUNT } from "@/constants";

export default function SummarizeTopic() {
  const { saveHistory, uid } = useHistorySaver();

  const [summary, setSummary] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [thinking, setThinking] = useState<boolean>(false);

  const [topic, setTopic] = useState<string>("");
  const [site1, setSite1] = useState<string>("");
  const [words, setWords] = useState<string>("30");
  const [progress, setProgress] = useState<number>(0);

  useScrollToResult(summary, flagged);

  const normalizeUrl = (value: string) => {
    if (!value) return "";
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "http:") {
        parsed.protocol = "https:";
      }
      return parsed.toString();
    } catch {
      return `https://${value.replace(/^https?:\/\//i, "")}`;
    }
  };

  const scrapeWebsite = async (rawUrl: string) => {
    try {
      const url = normalizeUrl(rawUrl);
      if (!url) {
        toast.error("Website URL is invalid");
        return "";
      }
      setProgress(20);

      const response = await axios.get("/api/proxy", { params: { url } });
      setProgress(50);

      const html = response.data;
      const $ = load(html);
      const scrapedContent = $("body").text().replace(/\s+/g, " ").trim();

      return scrapedContent;
    } catch (err) {
      console.error("Error scraping website:", err);
      toast.error("Failed to scrape website");
      return "";
    }
  };

  const getResponse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isIOSReactNativeWebView() && checkRestrictedWords(topic)) {
      alert("Your description contains restricted words and cannot be used.");
      return;
    }

    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);
    setProgress(0);

    let wordnum = Number(words || "30");
    if (wordnum < MIN_WORD_COUNT) wordnum = MIN_WORD_COUNT;
    if (wordnum > MAX_WORD_COUNT) wordnum = MAX_WORD_COUNT;

    let newPrompt = "Summarize this topic";
    let scrapedContent = "";

    if (site1) {
      scrapedContent = await scrapeWebsite(site1);
      if (scrapedContent) {
        newPrompt += ` based on the content from the website ${site1}`;
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
          topic: topic || site1,
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
      <form onSubmit={getResponse}>
        <label htmlFor="site1-field" className={labelClassName}>
          Website reference
          <input
            className={inputClassName}
            type="text"
            id="site1-field"
            maxLength={120}
            placeholder="Website URL to use as a reference."
            onChange={(e) => setSite1(e.target.value)}
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
            disabled={!active || !site1.trim()}
            loadingText="Summarizing"
          >
            Summarize Website
          </SubmitButton>
        </div>

        {Boolean(flagged) && (
          <h3
            id="flagged"
            className="p-3 bg-red-100 text-red-800 my-3 rounded-md"
          >
            {flagged}
          </h3>
        )}

        {!Boolean(flagged) && Boolean(summary) && (
          <div id="response">
            <h3
              className="cursor-pointer response bg-[#E7EAEF] text-[#0B3C68]"
              onClick={() => copyToClipboard(summary)}
            >
              {summary}
            </h3>
          </div>
        )}
      </form>
    </div>
  );
}
