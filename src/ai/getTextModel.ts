import { AI_MODELS, resolveAiModelKey } from "@/ai/models";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { xai, createXai } from "@ai-sdk/xai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";

export type TextModelConfig = {
  modelKey?: unknown;
  /**
   * If true, use the app's server-side API keys (credits mode).
   * If false, use user-provided API keys (when available).
   */
  useCredits?: boolean;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  xaiApiKey?: string;
  googleApiKey?: string;
};

/**
 * Server-only model factory.
 * - Always resolves the modelKey against a whitelist
 * - Supports both "credits mode" (server env keys) and "user keys mode"
 */
export function getTextModel(config: TextModelConfig) {
  const modelKey = resolveAiModelKey(config.modelKey);
  const def = AI_MODELS[modelKey];

  if (def.provider === "openai") {
    if (config.useCredits === false) {
      // User keys mode
      const apiKey = (config.openaiApiKey || "").trim();
      if (!apiKey) {
        throw new Error("Missing OpenAI API key (profile.openai_api_key).");
      }
      return createOpenAI({ apiKey })(def.modelId);
    }

    // Credits mode (server env OPENAI_API_KEY)
    return openai(def.modelId);
  }

  if (def.provider === "anthropic") {
    if (config.useCredits === false) {
      const apiKey = (config.anthropicApiKey || "").trim();
      if (!apiKey) {
        throw new Error(
          "Missing Anthropic API key (profile.anthropic_api_key)."
        );
      }
      return createAnthropic({ apiKey })(def.modelId);
    }

    return anthropic(def.modelId);
  }

  if (def.provider === "xai") {
    if (config.useCredits === false) {
      const apiKey = (config.xaiApiKey || "").trim();
      if (!apiKey) {
        throw new Error("Missing xAI API key (profile.xai_api_key).");
      }
      return createXai({ apiKey })(def.modelId);
    }

    return xai(def.modelId);
  }

  // Google Generative AI
  if (config.useCredits === false) {
    const apiKey = (config.googleApiKey || "").trim();
    if (!apiKey) {
      throw new Error("Missing Google API key (profile.google_api_key).");
    }
    return createGoogleGenerativeAI({ apiKey })(def.modelId);
  }

  return google(def.modelId);
}

