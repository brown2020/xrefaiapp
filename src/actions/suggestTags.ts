"use server";

import { generateText } from "ai";
import type { AiModelKey } from "@/ai/models";
import { getTextModel } from "@/ai/getTextModel";
import { requireAuthedUid } from "@/actions/serverAuth";
import { debitCreditsOrThrow } from "@/actions/serverCredits";
import { CREDITS_COSTS } from "@/constants/credits";

export const suggestTags = async (
  freestyle: string,
  tags: string[],
  options?: {
    useCredits?: boolean;
    modelKey?: AiModelKey;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    xaiApiKey?: string;
    googleApiKey?: string;
  }
): Promise<string | { error: string }> => {
  try {
    if ((options?.useCredits ?? true) !== false) {
      const uid = await requireAuthedUid();
      await debitCreditsOrThrow(uid, CREDITS_COSTS.tagSuggestion);
    }

    const model = getTextModel({
      modelKey: options?.modelKey,
      useCredits: options?.useCredits,
      openaiApiKey: options?.openaiApiKey,
      anthropicApiKey: options?.anthropicApiKey,
      xaiApiKey: options?.xaiApiKey,
      googleApiKey: options?.googleApiKey,
    });

    const { text } = await generateText({
      model,
      system:
        "For all responses, reply just the answer without giving any description.",
      prompt: `Using this prompt that image created with\n\nthe prompt: ${freestyle}\n\nSuggest tags for the image. It shouldn't be from this list: ${tags.join(
        ", "
      )}. Please list the tags in this format: separate all tags with commas, that's it, nothing else, and don't use a full stop at the end. Provide only 6 suggestions, no explanation.`,
      maxRetries: 2,
    });

    return text;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error suggesting tags:", error);
    return { error: errorMessage };
  }
};
