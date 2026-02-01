import { ModelMessage, streamText, type UIMessage } from "ai";
import type { AiModelKey } from "@/ai/models";
import { getTextModel } from "@/ai/getTextModel";
import { requireAuthedUid } from "@/actions/serverAuth";
import { debitCreditsOrThrow } from "@/actions/serverCredits";
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

    // Check rate limit before processing
    const rateLimitResponse = await rateLimitMiddleware(uid, "chat");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Generate or use client-provided idempotency key to prevent duplicate charges
    const idempotencyKey = body.idempotencyKey
      ? generateClientIdempotencyKey(uid, body.idempotencyKey)
      : generateIdempotencyKey(uid, { userText, modelKey: body.modelKey });

    if (body.useCredits !== false) {
      // Check idempotency to prevent double-charging on retries
      const idempotencyResult = await checkAndSetIdempotency(uid, idempotencyKey);

      if (!idempotencyResult.isNew) {
        // This request was already processed - don't charge again
        // But still generate the response (user might have lost connection)
        console.log(`Idempotent request detected for user ${uid}, skipping credit debit`);
      } else {
        // New request - charge credits
        try {
          await debitCreditsOrThrow(uid, CREDITS_COSTS.chatMessage, {
            reason: "chat_message",
            tool: "chat",
            modelKey: body.modelKey,
          });
          await markIdempotencyComplete(uid, idempotencyKey);
        } catch (error) {
          // If debit fails, allow retry
          await markIdempotencyFailed(uid, idempotencyKey);
          throw error;
        }
      }
    }

    const model = getTextModel({
      modelKey: body.modelKey,
      useCredits: body.useCredits,
      openaiApiKey: body.openaiApiKey,
      anthropicApiKey: body.anthropicApiKey,
      xaiApiKey: body.xaiApiKey,
      googleApiKey: body.googleApiKey,
    });

    const result = streamText({
      model,
      messages: buildMessages(body.history, userText),
    });

    return result.toUIMessageStreamResponse();
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
