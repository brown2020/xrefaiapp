"use client";

import BasePrompt from "./BasePrompt";
import TextareaAutosize from "react-textarea-autosize";

export default function FreestylePrompt() {
  return (
    <BasePrompt
      title="Freestyle Writing"
      systemPrompt="Respond freely and creatively to the user's prompt."
      promptBuilder={(input, wordCount) =>
        `Respond freely to this prompt in approximately ${wordCount} words: ${input}`
      }
      buttonText="Let's Write!"
      loadingText="Writing"
    >
      {({ inputValue, setInputValue }) => (
        <label htmlFor="topic-field" className="text-[#041D34] font-semibold">
          Prompt
          <TextareaAutosize
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5] w-full p-3 rounded-md outline-none resize-none"
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
