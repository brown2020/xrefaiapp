import { DEFAULT_WORD_COUNT } from "@/constants";

export const WRITING_DELIVERABLES = [
  {
    value: "freeform",
    label: "Freeform draft",
    instruction: "Follow the user's requested shape and keep the draft easy to edit.",
  },
  {
    value: "social-post",
    label: "Social post",
    instruction: "Open with a hook, keep paragraphs short, and end with a clear next step.",
  },
  {
    value: "professional-email",
    label: "Professional email",
    instruction: "Include a subject line, greeting, concise body, and direct closing.",
  },
  {
    value: "blog-outline",
    label: "Blog outline",
    instruction: "Use a title, section headings, bullets, and notes for what each section should cover.",
  },
  {
    value: "product-description",
    label: "Product description",
    instruction: "Explain the product, key benefits, proof points, and buying context.",
  },
  {
    value: "study-guide",
    label: "Study guide",
    instruction: "Include key concepts, plain-language definitions, a recap, and practice questions.",
  },
] as const;

export const WRITING_TONES = [
  {
    value: "clear",
    label: "Clear",
    instruction: "plainspoken and direct",
  },
  {
    value: "friendly",
    label: "Friendly",
    instruction: "warm, helpful, and conversational",
  },
  {
    value: "persuasive",
    label: "Persuasive",
    instruction: "benefit-led, specific, and action-oriented",
  },
  {
    value: "expert",
    label: "Expert",
    instruction: "confident, precise, and credible",
  },
  {
    value: "playful",
    label: "Playful",
    instruction: "light, energetic, and expressive",
  },
] as const;

export const WRITING_AUDIENCES = [
  { value: "general", label: "General audience" },
  { value: "customers", label: "Customers" },
  { value: "clients", label: "Clients" },
  { value: "students", label: "Students" },
  { value: "executives", label: "Executives" },
  { value: "creators", label: "Creators" },
] as const;

export const WRITING_LENGTH_PRESETS = [
  {
    value: "brief",
    label: "Brief",
    wordCount: 120,
    instruction: "compact and skimmable",
  },
  {
    value: "standard",
    label: "Standard",
    wordCount: 220,
    instruction: "balanced detail without padding",
  },
  {
    value: "detailed",
    label: "Detailed",
    wordCount: 360,
    instruction: "more complete, with useful supporting detail",
  },
] as const;

export type WritingDeliverable = (typeof WRITING_DELIVERABLES)[number]["value"];
export type WritingTone = (typeof WRITING_TONES)[number]["value"];
export type WritingAudience = (typeof WRITING_AUDIENCES)[number]["value"];
export type WritingLengthPreset =
  (typeof WRITING_LENGTH_PRESETS)[number]["value"];

export interface WritingSettings {
  deliverable: WritingDeliverable;
  tone: WritingTone;
  audience: WritingAudience;
  length: WritingLengthPreset;
  callToAction: string;
}

const DEFAULT_SETTINGS: WritingSettings = {
  deliverable: "freeform",
  tone: "clear",
  audience: "general",
  length: "standard",
  callToAction: "",
};

const STARTER_SETTINGS: Record<string, WritingSettings> = {
  "creator-social-captions": {
    deliverable: "social-post",
    tone: "playful",
    audience: "creators",
    length: "brief",
    callToAction: "Invite people to comment, click, or try the offer.",
  },
  "marketer-launch-email": {
    deliverable: "professional-email",
    tone: "persuasive",
    audience: "customers",
    length: "standard",
    callToAction: "Ask readers to take the next clear step.",
  },
};

function getOption<
  T extends readonly {
    value: string;
    label: string;
    instruction?: string;
    wordCount?: number;
  }[],
>(options: T, value: T[number]["value"]): T[number] {
  return options.find((option) => option.value === value) ?? options[0];
}

export function getInitialWritingSettings(
  starterIntentId: string | undefined
): WritingSettings {
  if (!starterIntentId) return DEFAULT_SETTINGS;
  return STARTER_SETTINGS[starterIntentId] ?? DEFAULT_SETTINGS;
}

export function getWritingLengthPreset(
  value: WritingLengthPreset
): (typeof WRITING_LENGTH_PRESETS)[number] {
  return getOption(WRITING_LENGTH_PRESETS, value);
}

export function getWritingToolKey(deliverable: WritingDeliverable): string {
  return `writing:${deliverable}`;
}

export function buildWritingPrompt(
  input: string,
  wordCount: number,
  settings: WritingSettings
): string {
  const deliverable = getOption(WRITING_DELIVERABLES, settings.deliverable);
  const tone = getOption(WRITING_TONES, settings.tone);
  const audience = getOption(WRITING_AUDIENCES, settings.audience);
  const length = getWritingLengthPreset(settings.length);
  const callToAction = settings.callToAction.trim();

  return [
    `Create a ${deliverable.label.toLowerCase()} in approximately ${wordCount} words.`,
    `Deliverable requirements: ${deliverable.instruction}`,
    `Tone: ${tone.label} (${tone.instruction}).`,
    `Audience: ${audience.label}.`,
    `Length: ${length.label} (${length.instruction}).`,
    callToAction
      ? `Call to action: ${callToAction}`
      : "Call to action: include a useful next step only if it fits the request.",
    "",
    "User prompt:",
    input.trim(),
  ].join("\n");
}

export function getWritingHistorySettings(
  settings: WritingSettings,
  requestedWordCount: number
): Record<string, string> {
  const deliverable = getOption(WRITING_DELIVERABLES, settings.deliverable);
  const tone = getOption(WRITING_TONES, settings.tone);
  const audience = getOption(WRITING_AUDIENCES, settings.audience);
  const length = getWritingLengthPreset(settings.length);
  const callToAction = settings.callToAction.trim();

  return {
    deliverable: settings.deliverable,
    deliverableLabel: deliverable.label,
    tone: settings.tone,
    toneLabel: tone.label,
    audience: settings.audience,
    audienceLabel: audience.label,
    length: settings.length,
    lengthLabel: length.label,
    requestedWordCount: String(
      Number.isFinite(requestedWordCount) ? requestedWordCount : DEFAULT_WORD_COUNT
    ),
    ...(callToAction ? { callToAction } : {}),
  };
}
