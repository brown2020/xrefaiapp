"use client";

import { useState } from "react";
import { copyToClipboard } from "@/utils/clipboard";
import { generateResponse } from "@/actions/generateAIResponse";
import { readStreamableValue } from "@ai-sdk/rsc";
import toast from "react-hot-toast";
import {
  checkRestrictedWords,
  isIOSReactNativeWebView,
} from "@/utils/platform";
import { useHistorySaver } from "@/hooks/useHistorySaver";
import { useScrollToResult } from "@/hooks/useScrollToResult";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";

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
  const { saveHistory, uid } = useHistorySaver();

  const [inputValue, setInputValue] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [thinking, setThinking] = useState<boolean>(false);
  const [words, setWords] = useState<string>("30");
  const [progress, setProgress] = useState<number>(0);

  useScrollToResult(summary, flagged);

  const getResponse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isIOSReactNativeWebView() && checkRestrictedWords(inputValue)) {
      alert("Your content contains restricted words and cannot be used.");
      return;
    }

    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);
    setProgress(0);

    let wordnum = Number(words || "30");
    if (wordnum < 3) wordnum = 3;
    if (wordnum > 800) wordnum = 800;

    const newPrompt = promptBuilder(inputValue, wordnum);
    let finishedSummary = "";

    try {
      const result = await generateResponse(systemPrompt, newPrompt);
      let chunkCount = 0;

      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          setSummary(finishedSummary);
          chunkCount++;
          const currentProgress = 20 + (chunkCount / wordnum) * 80;
          setProgress(Math.min(currentProgress, 95));
        }
      }

      setThinking(false);

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
      setThinking(false);
      setFlagged(
        "No suggestions found. Servers might be overloaded right now."
      );
      console.error("Error generating response:", error);
      toast.error(`Failed to generate ${title.toLowerCase()}`);
    } finally {
      setProgress(100);
      setActive(true);
    }
  };

  return (
    <div className="form-wrapper">
      <form onSubmit={getResponse}>
        {children({ inputValue, setInputValue, active })}

        {showWordCount && (
          <label htmlFor="words-field" className="text-[#041D34] font-semibold">
            Approximate number of words (Between 3 and 800)
            <input
              className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5] w-full p-3 rounded-md outline-none"
              defaultValue="30"
              type="number"
              id="words-field"
              placeholder="Enter number of words."
              onChange={(e) => setWords(e.target.value || "30")}
            />
          </label>
        )}

        <div className="mt-6">
          {thinking && (
            <div className="w-full mb-4 bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#48B461] h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center ${
              active && inputValue.trim()
                ? "bg-[#192449] text-white hover:bg-[#263566]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            type="submit"
            disabled={!active || !inputValue.trim()}
          >
            {thinking ? (
              <div className="flex items-center gap-2">
                <span>{loadingText}</span>
                <InlineSpinner size="sm" />
              </div>
            ) : (
              buttonText
            )}
          </button>
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
