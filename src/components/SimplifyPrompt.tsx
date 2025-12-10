"use client";

import { useState } from "react";
import BasePrompt from "./BasePrompt";
import TextareaAutosize from "react-textarea-autosize";

const gradeLevels = [
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "High School",
  "College",
  "PhD",
];

export default function SimplifyPrompt() {
  const [gradeLevel, setGradeLevel] = useState<string>("5th Grade");

  return (
    <BasePrompt
      title="Simplified Text"
      systemPrompt="Simplify the provided text to the requested grade level."
      promptBuilder={(input) =>
        `Simplify the following text to a ${gradeLevel} reading level:\n\n${input}`
      }
      buttonText="Simplify Writing"
      loadingText="Simplifying"
      showWordCount={false}
    >
      {({ inputValue, setInputValue }) => (
        <>
          <label htmlFor="text-field" className="text-[#041D34] font-semibold">
            Text to Simplify
            <TextareaAutosize
              className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5] w-full p-3 rounded-md outline-none resize-none"
              id="text-field"
              minRows={4}
              placeholder="Paste the text you want to simplify here."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              required
            />
          </label>

          <label htmlFor="grade-field" className="text-[#041D34] font-semibold">
            Target Grade Level
            <select
              className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5] w-full p-3 rounded-md outline-none appearance-none"
              id="grade-field"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
            >
              {gradeLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </BasePrompt>
  );
}
