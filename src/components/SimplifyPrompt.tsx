"use client";

import { useState } from "react";
import BasePrompt from "./BasePrompt";
import TextareaAutosize from "react-textarea-autosize";
import { GRADE_LEVELS } from "@/constants";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import type { ToolInitialProps } from "@/types/ToolInitialProps";

export default function SimplifyPrompt({
  initialInput,
  initialWords,
}: ToolInitialProps) {
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
      initialInput={initialInput}
      initialWordCount={initialWords}
    >
      {({ inputValue, setInputValue }) => (
        <>
          <label htmlFor="text-field" className={labelClassName}>
            Text to Simplify
            <TextareaAutosize
              className={`${inputClassName} resize-none`}
              id="text-field"
              minRows={4}
              placeholder="Paste the text you want to simplify here."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              required
            />
          </label>

          <label htmlFor="grade-field" className={labelClassName}>
            Target Grade Level
            <select
              className={`${inputClassName} appearance-none`}
              id="grade-field"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
            >
              {GRADE_LEVELS.map((level) => (
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
