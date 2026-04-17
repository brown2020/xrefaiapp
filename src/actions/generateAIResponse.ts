"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { ModelMessage, streamText } from "ai";
import { randomUUID } from "crypto";
import type { AiModelKey } from "@/ai/models";
import { getTextModel } from "@/ai/getTextModel";
import { requireAuthedUid } from "@/actions/serverAuth";
import { creditCredits, debitCreditsOrThrow } from "@/actions/serverCredits";
import { CREDITS_COSTS, getTextGenerationCreditsCost } from "@/constants/credits";
import { MAX_WORD_COUNT, MIN_WORD_COUNT } from "@/constants";
import {
  checkAndSetIdempotency,
  generateClientIdempotencyKey,
  generateIdempotencyKey,
  markIdempotencyComplete,
  markIdempotencyFailed,
} from "@/utils/idempotency";

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
  idempotencyKey?: string;
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
  idempotencyKey?: string;
}

type MessageInput = SimpleMessage | ConversationMessage;

/**
 * Unified AI response generator supporting both simple prompts and conversations.
 *
 * Credit-safety contract:
 * - Credits are debited BEFORE the stream starts.
 * - An idempotency key gates the debit so a retry (same content or same
 *   client-supplied key) is a no-op.
 * - If the stream errors or is aborted, credits are refunded and the
 *   idempotency record is cleared so the user can retry cleanly.
 */
export async function generateAIResponse(input: MessageInput) {
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

  const useCredits = input.useCredits !== false;
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

  let chargedUid = "";
  let creditsCharged = false;
  let idempotencyKey = "";
  let settled = false;

  const payloadForIdempotency =
    input.type === "simple"
      ? {
          type: "simple" as const,
          systemPrompt: input.systemPrompt,
          userPrompt: input.userPrompt,
          modelKey: input.modelKey,
        }
      : {
          type: "conversation" as const,
          systemPrompt: input.systemPrompt,
          messages: input.messages,
          modelKey: input.modelKey,
        };

  const settleFailure = async () => {
    if (settled) return;
    settled = true;
    if (!useCredits || !chargedUid) return;

    if (creditsCharged) {
      try {
        await creditCredits(chargedUid, cost, {
          reason:
            input.type === "conversation"
              ? "chat_message_refund"
              : "text_generation_refund",
          tool: input.type === "conversation" ? "chat" : "tools",
          modelKey: input.modelKey,
          deterministicId: `refund_generation_${idempotencyKey || randomUUID()}`,
        });
      } catch (refundError) {
        console.error("Generation refund failed:", refundError);
      }
    }
    if (idempotencyKey) {
      await markIdempotencyFailed(chargedUid, idempotencyKey).catch(() => undefined);
    }
  };

  const settleSuccess = async () => {
    if (settled) return;
    settled = true;
    if (!useCredits || !chargedUid || !idempotencyKey) return;
    try {
      await markIdempotencyComplete(chargedUid, idempotencyKey);
    } catch (error) {
      console.error("Idempotency completion mark failed:", error);
    }
  };

  if (useCredits) {
    chargedUid = await requireAuthedUid();
    idempotencyKey = input.idempotencyKey
      ? generateClientIdempotencyKey(chargedUid, input.idempotencyKey)
      : generateIdempotencyKey(chargedUid, payloadForIdempotency);

    const idempotencyResult = await checkAndSetIdempotency(chargedUid, idempotencyKey);
    if (!idempotencyResult.isNew) {
      if (idempotencyResult.status === "completed") {
        throw new Error("DUPLICATE_REQUEST");
      }
      throw new Error("REQUEST_IN_PROGRESS");
    }

    try {
      await debitCreditsOrThrow(chargedUid, cost, {
        reason: input.type === "conversation" ? "chat_message" : "text_generation",
        tool: input.type === "conversation" ? "chat" : "tools",
        modelKey: input.modelKey,
        refId: idempotencyKey,
      });
      creditsCharged = true;
    } catch (error) {
      await markIdempotencyFailed(chargedUid, idempotencyKey).catch(() => undefined);
      throw error;
    }
  }

  const abortController = new AbortController();

  try {
    const result = streamText({
      model,
      messages,
      abortSignal: abortController.signal,
      onFinish: () => {
        void settleSuccess();
      },
      onError: (event) => {
        const streamError =
          typeof event === "object" && event !== null && "error" in event
            ? (event as { error?: unknown }).error
            : event;
        console.error("Generation stream error:", streamError);
        void settleFailure();
      },
      onAbort: () => {
        void settleFailure();
      },
    });

    // `createStreamableValue` exposes an RSC-friendly iterable. Use
    // `append()` so the consumer sees progressively-growing cumulative
    // text (each `readStreamableValue` iteration yields the full response
    // so far, matching what every caller expects when they do
    // `finishedSummary = content.trim()`).
    //
    // Wrapping the pump in try/catch lets us:
    //   - propagate underlying stream errors via `stream.error`.
    //   - call `settleFailure` if the provider yields no finishing signal.
    const stream = createStreamableValue<string>();
    (async () => {
      try {
        for await (const chunk of result.textStream) {
          stream.append(chunk);
        }
        stream.done();
      } catch (error) {
        console.error("Generation stream pump error:", error);
        stream.error(error);
        await settleFailure();
      }
    })();

    return stream.value;
  } catch (error) {
    await settleFailure();
    throw error;
  }
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
    idempotencyKey?: string;
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
    idempotencyKey?: string;
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
