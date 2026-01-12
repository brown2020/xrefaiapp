"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { ModelMessage, streamText } from "ai";
import type { AiModelKey } from "@/ai/models";
import { getTextModel } from "@/ai/getTextModel";
import { requireAuthedUid } from "@/actions/serverAuth";
import { debitCreditsOrThrow } from "@/actions/serverCredits";
import { CREDITS_COSTS, getTextGenerationCreditsCost } from "@/constants/credits";
import { MAX_WORD_COUNT, MIN_WORD_COUNT } from "@/constants";

interface SimpleMessage {
  type: "simple";
  systemPrompt: string;
  userPrompt: string;
  requestedWordCount?: number;
  modelKey?: AiModelKey;
  useCredits?: boolean;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  xaiApiKey?: string;
  googleApiKey?: string;
}

interface ConversationMessage {
  type: "conversation";
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  modelKey?: AiModelKey;
  useCredits?: boolean;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  xaiApiKey?: string;
  googleApiKey?: string;
}

type MessageInput = SimpleMessage | ConversationMessage;

/**
 * Unified AI response generator supporting both simple prompts and conversations
 */
export async function generateAIResponse(input: MessageInput) {
  // Server-side credit enforcement: if the caller wants to use app keys (credits mode),
  // require auth and debit credits atomically.
  //
  // If `useCredits === false`, the request must supply user API keys and is billed to the user.
  if (input.useCredits !== false) {
    const uid = await requireAuthedUid();
    const cost =
      input.type === "conversation"
        ? CREDITS_COSTS.chatMessage
        : getTextGenerationCreditsCost(
            Math.max(
              MIN_WORD_COUNT,
              Math.min(
                MAX_WORD_COUNT,
                Math.floor(Number(input.requestedWordCount ?? MIN_WORD_COUNT))
              )
            )
          );
    await debitCreditsOrThrow(uid, cost);
  }

  const model = getTextModel({
    modelKey: input.modelKey,
    useCredits: input.useCredits,
    openaiApiKey: input.openaiApiKey,
    anthropicApiKey: input.anthropicApiKey,
    xaiApiKey: input.xaiApiKey,
    googleApiKey: input.googleApiKey,
  });

  const messages: ModelMessage[] =
    input.type === "simple"
      ? [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ]
      : [
          { role: "system", content: input.systemPrompt },
          ...input.messages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        ];

  const result = streamText({ model, messages });
  const stream = createStreamableValue(result.textStream);
  return stream.value;
}

/**
 * Simple response generation (wrapper for backward compatibility)
 */
export async function generateResponse(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    modelKey?: AiModelKey;
    useCredits?: boolean;
    requestedWordCount?: number;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    xaiApiKey?: string;
    googleApiKey?: string;
  }
) {
  return generateAIResponse({
    type: "simple",
    systemPrompt,
    userPrompt,
    ...options,
  });
}

/**
 * Conversation response generation with memory (wrapper for backward compatibility)
 */
export async function generateResponseWithMemory(
  systemPrompt: string,
  chatHistory: Array<{ prompt: string; response: string }>,
  options?: {
    modelKey?: AiModelKey;
    useCredits?: boolean;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    xaiApiKey?: string;
    googleApiKey?: string;
  }
) {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const chat of chatHistory) {
    if (chat.prompt) {
      messages.push({ role: "user", content: chat.prompt });
    }
    if (chat.response) {
      messages.push({ role: "assistant", content: chat.response });
    }
  }

  return generateAIResponse({
    type: "conversation",
    systemPrompt,
    messages,
    ...options,
  });
}






