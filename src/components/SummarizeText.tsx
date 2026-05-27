"use client";

import { useState } from "react";
import BasePrompt from "./BasePrompt";
import TextareaAutosize from "react-textarea-autosize";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import type { ToolInitialProps } from "@/types/ToolInitialProps";
import SummaryControls from "@/components/SummaryControls";
import {
  DEFAULT_SUMMARY_SETTINGS,
  buildSummaryPrompt,
  getSummaryHistorySettings,
  type SummarySettings,
} from "@/constants/summaryControls";

export default function SummarizeText({
  initialInput,
  initialWords,
}: ToolInitialProps) {
  const [settings, setSettings] = useState<SummarySettings>(
    DEFAULT_SUMMARY_SETTINGS
  );

  return (
    <BasePrompt
      title="Text Summary"
      systemPrompt="You are Xref.ai. Summarize the provided text accurately. Follow the requested format, audience, emphasis, and focus without adding unsupported details."
      promptBuilder={(input, wordCount) =>
        buildSummaryPrompt(input, wordCount, settings)
      }
      historyTool="summary:text"
      historySettings={(wordCount) =>
        getSummaryHistorySettings(settings, wordCount)
      }
      buttonText="Summarize Text"
      loadingText="Summarizing"
      initialInput={initialInput}
      initialWordCount={initialWords}
    >
      {({ inputValue, setInputValue }) => (
        <>
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

          <SummaryControls
            value={settings}
            onChange={setSettings}
          />
        </>
      )}
    </BasePrompt>
  );
}
