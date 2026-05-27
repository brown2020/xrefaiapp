"use client";

import {
  SUMMARY_AUDIENCES,
  SUMMARY_EMPHASES,
  SUMMARY_FORMATS,
  type SummaryAudience,
  type SummaryEmphasis,
  type SummaryFormat,
  type SummarySettings,
} from "@/constants/summaryControls";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";

interface SummaryControlsProps {
  value: SummarySettings;
  onChange: (value: SummarySettings) => void;
}

export default function SummaryControls({
  value,
  onChange,
}: SummaryControlsProps) {
  const update = <Key extends keyof SummarySettings>(
    key: Key,
    nextValue: SummarySettings[Key]
  ) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <fieldset className="rounded-lg border border-border bg-muted/30 p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Summary controls
      </legend>

      <div className="grid gap-4 md:grid-cols-3">
        <label htmlFor="summary-format-field" className={labelClassName}>
          Summary format
          <select
            id="summary-format-field"
            className={`${inputClassName} appearance-none`}
            value={value.format}
            onChange={(event) =>
              update("format", event.target.value as SummaryFormat)
            }
          >
            {SUMMARY_FORMATS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="summary-audience-field" className={labelClassName}>
          Audience
          <select
            id="summary-audience-field"
            className={`${inputClassName} appearance-none`}
            value={value.audience}
            onChange={(event) =>
              update("audience", event.target.value as SummaryAudience)
            }
          >
            {SUMMARY_AUDIENCES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="summary-emphasis-field" className={labelClassName}>
          Emphasis
          <select
            id="summary-emphasis-field"
            className={`${inputClassName} appearance-none`}
            value={value.emphasis}
            onChange={(event) =>
              update("emphasis", event.target.value as SummaryEmphasis)
            }
          >
            {SUMMARY_EMPHASES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label htmlFor="summary-focus-field" className={`${labelClassName} mt-4`}>
        Focus
        <input
          id="summary-focus-field"
          className={inputClassName}
          value={value.focus}
          placeholder="Optional angle, question, or detail to prioritize."
          onChange={(event) => update("focus", event.target.value)}
        />
      </label>
    </fieldset>
  );
}
