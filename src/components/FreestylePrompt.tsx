"use client";

import BasePrompt from "./BasePrompt";
import TextareaAutosize from "react-textarea-autosize";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import type { ToolInitialProps } from "@/types/ToolInitialProps";

export default function FreestylePrompt({
  initialInput,
  initialWords,
}: ToolInitialProps) {
  return (
    <BasePrompt
      title="Freestyle Writing"
      systemPrompt="Respond freely and creatively to the user's prompt."
      promptBuilder={(input, wordCount) =>
        `Respond freely to this prompt in approximately ${wordCount} words: ${input}`
      }
      buttonText="Let's Write!"
      loadingText="Writing"
      initialInput={initialInput}
      initialWordCount={initialWords}
    >
      {({ inputValue, setInputValue }) => (
        <label htmlFor="topic-field" className={labelClassName}>
          Prompt
          <TextareaAutosize
            className={`${inputClassName} resize-none`}
            id="topic-field"
            minRows={4}
            placeholder="Enter your freestyle prompt."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </label>
      )}
    </BasePrompt>
  );
}
