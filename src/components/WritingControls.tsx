"use client";

import {
  WRITING_AUDIENCES,
  WRITING_DELIVERABLES,
  WRITING_LENGTH_PRESETS,
  WRITING_TONES,
  getWritingLengthPreset,
  type WritingAudience,
  type WritingDeliverable,
  type WritingLengthPreset,
  type WritingSettings,
  type WritingTone,
} from "@/constants/writingControls";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";

interface WritingControlsProps {
  value: WritingSettings;
  onChange: (value: WritingSettings) => void;
  onWordCountChange: (value: string) => void;
}

export default function WritingControls({
  value,
  onChange,
  onWordCountChange,
}: WritingControlsProps) {
  const update = <Key extends keyof WritingSettings>(
    key: Key,
    nextValue: WritingSettings[Key]
  ) => {
    onChange({ ...value, [key]: nextValue });
  };

  const updateLength = (nextValue: WritingLengthPreset) => {
    update("length", nextValue);
    onWordCountChange(String(getWritingLengthPreset(nextValue).wordCount));
  };

  return (
    <fieldset className="rounded-lg border border-border bg-muted/30 p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Writing controls
      </legend>

      <div className="grid gap-4 md:grid-cols-2">
        <label htmlFor="deliverable-field" className={labelClassName}>
          Deliverable
          <select
            id="deliverable-field"
            className={`${inputClassName} appearance-none`}
            value={value.deliverable}
            onChange={(event) =>
              update("deliverable", event.target.value as WritingDeliverable)
            }
          >
            {WRITING_DELIVERABLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="tone-field" className={labelClassName}>
          Tone
          <select
            id="tone-field"
            className={`${inputClassName} appearance-none`}
            value={value.tone}
            onChange={(event) =>
              update("tone", event.target.value as WritingTone)
            }
          >
            {WRITING_TONES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="audience-field" className={labelClassName}>
          Audience
          <select
            id="audience-field"
            className={`${inputClassName} appearance-none`}
            value={value.audience}
            onChange={(event) =>
              update("audience", event.target.value as WritingAudience)
            }
          >
            {WRITING_AUDIENCES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="length-preset-field" className={labelClassName}>
          Draft length
          <select
            id="length-preset-field"
            className={`${inputClassName} appearance-none`}
            value={value.length}
            onChange={(event) =>
              updateLength(event.target.value as WritingLengthPreset)
            }
          >
            {WRITING_LENGTH_PRESETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label htmlFor="call-to-action-field" className={`${labelClassName} mt-4`}>
        Call to action
        <input
          id="call-to-action-field"
          className={inputClassName}
          value={value.callToAction}
          placeholder="Optional next step for the reader."
          onChange={(event) => update("callToAction", event.target.value)}
        />
      </label>
    </fieldset>
  );
}
