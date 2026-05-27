"use client";

import { useState } from "react";
import BasePrompt from "./BasePrompt";
import TextareaAutosize from "react-textarea-autosize";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import type { ToolInitialProps } from "@/types/ToolInitialProps";
import WritingControls from "@/components/WritingControls";
import {
  buildWritingPrompt,
  getInitialWritingSettings,
  getWritingHistorySettings,
  getWritingLengthPreset,
  getWritingToolKey,
  type WritingSettings,
} from "@/constants/writingControls";

export default function FreestylePrompt({
  initialInput,
  initialWords,
  starterIntentId,
}: ToolInitialProps) {
  const initialSettings = getInitialWritingSettings(starterIntentId);
  const [settings, setSettings] = useState<WritingSettings>(initialSettings);
  const initialWordCount =
    initialWords ?? getWritingLengthPreset(initialSettings.length).wordCount;

  return (
    <BasePrompt
      title="Freestyle Writing"
      systemPrompt="You are Xref.ai. Create polished, ready-to-use writing. Follow the requested format, tone, audience, length, and call to action without adding extra commentary."
      promptBuilder={(input, wordCount) =>
        buildWritingPrompt(input, wordCount, settings)
      }
      historyTool={getWritingToolKey(settings.deliverable)}
      historyStarterIntentId={starterIntentId}
      historySettings={(wordCount) =>
        getWritingHistorySettings(settings, wordCount)
      }
      buttonText="Let's Write!"
      loadingText="Writing"
      initialInput={initialInput}
      initialWordCount={initialWordCount}
    >
      {({ inputValue, setInputValue, setWordCountValue }) => (
        <>
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

          <WritingControls
            value={settings}
            onChange={setSettings}
            onWordCountChange={setWordCountValue}
          />
        </>
      )}
    </BasePrompt>
  );
}
