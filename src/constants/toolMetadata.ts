import {
  DEFAULT_WORD_COUNT,
  MAX_WORD_COUNT,
  MIN_WORD_COUNT,
} from "@/constants";
import {
  CREDITS_COSTS,
  getTextGenerationCreditsCost,
} from "@/constants/credits";

export const TOOL_KEYS = [
  "Summarize Website",
  "Summarize Text",
  "Freestyle Writing",
  "Simplify Writing",
  "Generate Image",
  "Designer Tool",
] as const;

export type ToolKey = (typeof TOOL_KEYS)[number];

export interface ToolGuide {
  title: ToolKey;
  expectedInput: string;
  exampleInput: string;
  estimatedCreditCost: string;
  likelyOutput: string;
}

export const TOOL_GUIDES: Record<ToolKey, ToolGuide> = {
  "Summarize Website": {
    title: "Summarize Website",
    expectedInput: "A public HTTPS URL, plus an optional focus or question.",
    exampleInput: "https://example.com/article with focus: key takeaways",
    estimatedCreditCost: `${getTextGenerationCreditsCost(
      DEFAULT_WORD_COUNT
    )}+ credits depending on requested length`,
    likelyOutput: "A concise summary grounded in the page content.",
  },
  "Summarize Text": {
    title: "Summarize Text",
    expectedInput: "Pasted notes, article text, transcripts, or research snippets plus optional summary controls.",
    exampleInput: "Paste meeting notes and choose Actions and decisions emphasis.",
    estimatedCreditCost: `${getTextGenerationCreditsCost(
      DEFAULT_WORD_COUNT
    )}+ credits depending on requested length`,
    likelyOutput: "A shorter version shaped by format, audience, emphasis, and focus.",
  },
  "Freestyle Writing": {
    title: "Freestyle Writing",
    expectedInput: "A topic or rough idea, plus optional deliverable controls.",
    exampleInput: "Choose Professional email, then describe a product launch.",
    estimatedCreditCost: `${getTextGenerationCreditsCost(
      DEFAULT_WORD_COUNT
    )}+ credits depending on requested length`,
    likelyOutput: "A ready-to-edit draft shaped by format, tone, audience, and CTA.",
  },
  "Simplify Writing": {
    title: "Simplify Writing",
    expectedInput: "Text that should be clearer, shorter, or easier to read.",
    exampleInput: "Paste a dense paragraph and choose a target grade level.",
    estimatedCreditCost: `${getTextGenerationCreditsCost(
      DEFAULT_WORD_COUNT
    )}+ credits`,
    likelyOutput: "A simpler rewrite at the selected reading level.",
  },
  "Generate Image": {
    title: "Generate Image",
    expectedInput: "A visual scene, subject, mood, composition, or style.",
    exampleInput: "A bright editorial photo of a desk setup for a creator studio.",
    estimatedCreditCost: `${CREDITS_COSTS.imageGeneration} credits`,
    likelyOutput: "A generated image with copy and download actions.",
  },
  "Designer Tool": {
    title: "Designer Tool",
    expectedInput: "A design idea plus optional style, flavor, color, and object cues.",
    exampleInput: "A poster for a summer pop-up, with citrus colors and bold type.",
    estimatedCreditCost: `${CREDITS_COSTS.imageGeneration} credits`,
    likelyOutput: "A structured image prompt turned into a generated design.",
  },
};

export function isToolKey(value: unknown): value is ToolKey {
  return typeof value === "string" && TOOL_KEYS.includes(value as ToolKey);
}

export function clampStarterWordCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_WORD_COUNT;
  }
  return Math.min(MAX_WORD_COUNT, Math.max(MIN_WORD_COUNT, Math.floor(value)));
}
