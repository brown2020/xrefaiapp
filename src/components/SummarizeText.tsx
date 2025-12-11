"use client";

import BasePrompt from "./BasePrompt";
import TextareaAutosize from "react-textarea-autosize";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";

export default function SummarizeText() {
  return (
    <BasePrompt
      title="Text Summary"
      systemPrompt="Summarize the provided text concisely."
      promptBuilder={(input, wordCount) =>
        `Summarize the following text in approximately ${wordCount} words:\n\n${input}`
      }
      buttonText="Summarize Text"
      loadingText="Summarizing"
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
