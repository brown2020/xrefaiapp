"use client";

import BasePrompt from "./BasePrompt";
import TextareaAutosize from "react-textarea-autosize";

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
        <label htmlFor="text-field" className="text-[#041D34] font-semibold">
          Text to Summarize
          <TextareaAutosize
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5] w-full p-3 rounded-md outline-none resize-none"
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
