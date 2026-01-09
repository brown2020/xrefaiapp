export type AiProvider = "openai" | "anthropic" | "xai" | "google";

/**
 * Model keys are persisted (e.g. in Firestore) and used by the server to
 * safely select a provider + model from a whitelist.
 */
export type AiModelKey =
  | "openai:gpt-5.2"
  | "anthropic:claude-sonnet-4-5-20250929"
  | "xai:grok-4"
  | "google:gemini-3-pro-preview";

export type AiModelDefinition = {
  key: AiModelKey;
  provider: AiProvider;
  modelId: string;
  label: string;
  /**
   * Optional hint for the UI to group/describe models.
   * Not used for logic.
   */
  family?: string;
};

export const AI_MODELS: Record<AiModelKey, AiModelDefinition> = {
  "openai:gpt-5.2": {
    key: "openai:gpt-5.2",
    provider: "openai",
    modelId: "gpt-5.2",
    label: "GPT‑5.2",
    family: "OpenAI",
  },
  "anthropic:claude-sonnet-4-5-20250929": {
    key: "anthropic:claude-sonnet-4-5-20250929",
    provider: "anthropic",
    modelId: "claude-sonnet-4-5-20250929",
    label: "Claude Sonnet 4.5",
    family: "Anthropic",
  },
  "xai:grok-4": {
    key: "xai:grok-4",
    provider: "xai",
    modelId: "grok-4",
    label: "Grok 4",
    family: "xAI",
  },
  "google:gemini-3-pro-preview": {
    key: "google:gemini-3-pro-preview",
    provider: "google",
    modelId: "gemini-3-pro-preview",
    label: "Gemini 3",
    family: "Google",
  },
};

export const DEFAULT_TEXT_MODEL_KEY: AiModelKey = "openai:gpt-5.2";

export const listAiModels = (): AiModelDefinition[] =>
  Object.values(AI_MODELS);

export function isAiModelKey(value: unknown): value is AiModelKey {
  return typeof value === "string" && value in AI_MODELS;
}

export function resolveAiModelKey(value: unknown): AiModelKey {
  return isAiModelKey(value) ? value : DEFAULT_TEXT_MODEL_KEY;
}

