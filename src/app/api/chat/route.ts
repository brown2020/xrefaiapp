import { ModelMessage, streamText, type UIMessage } from "ai";
import type { AiModelKey } from "@/ai/models";
import { getTextModel } from "@/ai/getTextModel";
import { requireAuthedUid } from "@/actions/serverAuth";
import { creditCredits, debitCreditsOrThrow } from "@/actions/serverCredits";
import { CREDITS_COSTS } from "@/constants/credits";
import {
  generateIdempotencyKey,
  generateClientIdempotencyKey,
  checkAndSetIdempotency,
  markIdempotencyComplete,
  markIdempotencyFailed,
} from "@/utils/idempotency";
import { rateLimitMiddleware } from "@/utils/rateLimit";

export const runtime = "nodejs";

type ChatHistoryItem = { prompt: string; response: string };

type ChatRequestBody = {
  messages: UIMessage[];
  history?: ChatHistoryItem[];
  modelKey?: AiModelKey;
  useCredits?: boolean;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  xaiApiKey?: string;
  googleApiKey?: string;
  /** Optional client-provided idempotency key to prevent duplicate charges on retries */
  idempotencyKey?: string;
};

const SYSTEM_PROMPT = "The user will ask you questions. Respond in a helpful way.";

function getMessageText(message: UIMessage): string {
  if (message.parts?.length) {
    let text = "";
    for (const part of message.parts) {
      if (
        part.type === "text" &&
        typeof (part as { text?: string }).text === "string"
      ) {
        text += (part as { text: string }).text;
      }
    }
    return text;
  }
  return "";
}

function buildMessages(
  history: ChatHistoryItem[] | undefined,
  userText: string
): ModelMessage[] {
  const messages: ModelMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

  if (Array.isArray(history)) {
    for (const item of history) {
      if (item.prompt) {
        messages.push({ role: "user", content: item.prompt });
      }
      if (item.response) {
        messages.push({ role: "assistant", content: item.response });
      }
    }
  }

  messages.push({ role: "user", content: userText });
  return messages;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const latestUser = [...messages].reverse().find((m) => m.role === "user");
    const userText = latestUser ? getMessageText(latestUser).trim() : "";

    if (!userText) {
      return Response.json({ error: "Missing user message" }, { status: 400 });
    }

    const uid = await requireAuthedUid();
    const useCredits = body.useCredits !== false;

    // Check rate limit before processing
    const rateLimitResponse = await rateLimitMiddleware(uid, "chat");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const model = getTextModel({
      modelKey: body.modelKey,
      useCredits: body.useCredits,
      openaiApiKey: body.openaiApiKey,
      anthropicApiKey: body.anthropicApiKey,
      xaiApiKey: body.xaiApiKey,
      googleApiKey: body.googleApiKey,
    });

    // Generate or use client-provided idempotency key to prevent duplicate charges
    const idempotencyKey = body.idempotencyKey
      ? generateClientIdempotencyKey(uid, body.idempotencyKey)
      : generateIdempotencyKey(uid, { userText, modelKey: body.modelKey });

    let requestSettled = false;
    let creditsCharged = false;

    const settleFailure = async () => {
      if (requestSettled) return;
      requestSettled = true;

      if (useCredits) {
        if (creditsCharged) {
          await creditCredits(uid, CREDITS_COSTS.chatMessage, {
            reason: "chat_message_refund",
            tool: "chat",
            modelKey: body.modelKey,
            refId: idempotencyKey,
            deterministicId: `refund_chat_${idempotencyKey}`,
          });
        }
        await markIdempotencyFailed(uid, idempotencyKey);
      }
    };

    const settleSuccess = async () => {
      if (requestSettled) return;
      requestSettled = true;

      if (useCredits) {
        await markIdempotencyComplete(uid, idempotencyKey);
      }
    };

    if (useCredits) {
      // Check idempotency to prevent double-charging on retries
      const idempotencyResult = await checkAndSetIdempotency(uid, idempotencyKey);

      if (!idempotencyResult.isNew) {
        const errorCode =
          idempotencyResult.status === "completed"
            ? "DUPLICATE_CHAT_REQUEST"
            : "CHAT_REQUEST_IN_PROGRESS";
        return Response.json({ error: errorCode }, { status: 409 });
      }

      // New request - charge credits
      try {
        await debitCreditsOrThrow(uid, CREDITS_COSTS.chatMessage, {
          reason: "chat_message",
          tool: "chat",
          modelKey: body.modelKey,
          refId: idempotencyKey,
        });
        creditsCharged = true;
      } catch (error) {
        await markIdempotencyFailed(uid, idempotencyKey);
        throw error;
      }
    }

    try {
      const result = streamText({
        model,
        messages: buildMessages(body.history, userText),
        onFinish: async () => {
          await settleSuccess();
        },
        onError: async (event) => {
          const streamError =
            typeof event === "object" && event !== null && "error" in event
              ? (event as { error?: unknown }).error
              : event;
          console.error("Chat stream error:", streamError);
          await settleFailure();
        },
      });

      return result.toUIMessageStreamResponse();
    } catch (error) {
      await settleFailure();
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    console.error("Chat API error:", error);
    return Response.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
