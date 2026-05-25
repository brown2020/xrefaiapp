"use client";

import BasePrompt from "./BasePrompt";
import TextareaAutosize from "react-textarea-autosize";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import type { ToolInitialProps } from "@/types/ToolInitialProps";

export default function SummarizeText({
  initialInput,
  initialWords,
}: ToolInitialProps) {
  return (
    <BasePrompt
      title="Text Summary"
      systemPrompt="Summarize the provided text concisely."
      promptBuilder={(input, wordCount) =>
        `Summarize the following text in approximately ${wordCount} words:\n\n${input}`
      }
      buttonText="Summarize Text"
      loadingText="Summarizing"
      initialInput={initialInput}
      initialWordCount={initialWords}
    >
      {({ inputValue, setInputValue }) => (
        <label htmlFor="text-field" className={labelClassName}>
          Text to Summarize
          <TextareaAutosize
            className={`${inputClassName} resize-none`}
            id="text-field"
            minRows={4}
            placeholder="Paste the text you want to summarize here."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            required
          />
        </label>
      )}
    </BasePrompt>
  );
}
