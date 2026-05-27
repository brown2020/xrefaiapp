import { DEFAULT_WORD_COUNT } from "@/constants";

export const SUMMARY_FORMATS = [
  {
    value: "concise",
    label: "Concise summary",
    instruction: "Write short paragraphs with only the most important points.",
  },
  {
    value: "key-takeaways",
    label: "Key takeaways",
    instruction: "Use bullets organized around the most useful takeaways.",
  },
  {
    value: "executive-brief",
    label: "Executive brief",
    instruction:
      "Lead with the decision-relevant point, then include context and implications.",
  },
  {
    value: "study-notes",
    label: "Study notes",
    instruction:
      "Use headings, definitions, and a short recap that helps someone learn the material.",
  },
] as const;

export const SUMMARY_AUDIENCES = [
  { value: "general", label: "General reader" },
  { value: "executives", label: "Executives" },
  { value: "clients", label: "Clients" },
  { value: "students", label: "Students" },
  { value: "researchers", label: "Researchers" },
] as const;

export const SUMMARY_EMPHASES = [
  {
    value: "main-ideas",
    label: "Main ideas",
    instruction: "prioritize the core argument, facts, and conclusions",
  },
  {
    value: "actions-decisions",
    label: "Actions and decisions",
    instruction: "highlight decisions, next steps, owners, and deadlines when present",
  },
  {
    value: "claims-evidence",
    label: "Claims and evidence",
    instruction: "separate claims from supporting evidence and caveats",
  },
  {
    value: "questions-risks",
    label: "Questions and risks",
    instruction: "surface open questions, risks, assumptions, and unclear points",
  },
] as const;

export type SummaryFormat = (typeof SUMMARY_FORMATS)[number]["value"];
export type SummaryAudience = (typeof SUMMARY_AUDIENCES)[number]["value"];
export type SummaryEmphasis = (typeof SUMMARY_EMPHASES)[number]["value"];

export interface SummarySettings {
  format: SummaryFormat;
  audience: SummaryAudience;
  emphasis: SummaryEmphasis;
  focus: string;
}

export const DEFAULT_SUMMARY_SETTINGS: SummarySettings = {
  format: "concise",
  audience: "general",
  emphasis: "main-ideas",
  focus: "",
};

function getOption<
  T extends readonly {
    value: string;
    label: string;
    instruction?: string;
  }[],
>(options: T, value: T[number]["value"]): T[number] {
  return options.find((option) => option.value === value) ?? options[0];
}

export function buildSummaryPrompt(
  input: string,
  wordCount: number,
  settings: SummarySettings
): string {
  const format = getOption(SUMMARY_FORMATS, settings.format);
  const audience = getOption(SUMMARY_AUDIENCES, settings.audience);
  const emphasis = getOption(SUMMARY_EMPHASES, settings.emphasis);
  const focus = settings.focus.trim();

  return [
    `Summarize the following text in approximately ${wordCount} words.`,
    `Summary format: ${format.label}. ${format.instruction}`,
    `Audience: ${audience.label}.`,
    `Emphasis: ${emphasis.label}; ${emphasis.instruction}.`,
    focus ? `Specific focus: ${focus}` : "Specific focus: none provided.",
    "",
    "Text to summarize:",
    input.trim(),
  ].join("\n");
}

export function getSummaryHistorySettings(
  settings: SummarySettings,
  requestedWordCount: number
): Record<string, string> {
  const format = getOption(SUMMARY_FORMATS, settings.format);
  const audience = getOption(SUMMARY_AUDIENCES, settings.audience);
  const emphasis = getOption(SUMMARY_EMPHASES, settings.emphasis);
  const focus = settings.focus.trim();

  return {
    format: settings.format,
    formatLabel: format.label,
    audience: settings.audience,
    audienceLabel: audience.label,
    emphasis: settings.emphasis,
    emphasisLabel: emphasis.label,
    requestedWordCount: String(
      Number.isFinite(requestedWordCount) ? requestedWordCount : DEFAULT_WORD_COUNT
    ),
    ...(focus ? { focus } : {}),
  };
}
