"use client";

import { useState } from "react";
import { generateResponse } from "@/actions/generateAIResponse";
import { readStreamableValue } from "@ai-sdk/rsc";
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
import { ResponseDisplay } from "@/components/ui/ResponseDisplay";
import { MIN_WORD_COUNT, MAX_WORD_COUNT } from "@/constants";

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
    if (wordnum < MIN_WORD_COUNT) wordnum = MIN_WORD_COUNT;
    if (wordnum > MAX_WORD_COUNT) wordnum = MAX_WORD_COUNT;

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
