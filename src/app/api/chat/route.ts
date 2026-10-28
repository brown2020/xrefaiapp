import { randomUUID } from "crypto";
import {
  createUIMessageStreamResponse,
  ModelMessage,
  streamText,
  toUIMessageStream,
} from "ai";
import { NextRequest } from "next/server";
import { getTextModel } from "@/ai/getTextModel";
import { requireAuthedUidFromRequest } from "@/utils/requireAuthedRequest";
import { creditCredits, debitCreditsIdempotent, getCredits } from "@/actions/serverCredits";
import { TEXT_PROVIDER_TIMEOUT_MS } from "@/constants";
import { CREDITS_COSTS } from "@/constants/credits";
import {
  generateIdempotencyKey,
  generateClientIdempotencyKey,
  markIdempotencyComplete,
  markIdempotencyFailed,
} from "@/utils/idempotency";
import { rateLimitMiddleware } from "@/utils/rateLimit";
import { getMessageText } from "@/utils/messages";
import { chatRequestSchema } from "@/utils/actionContracts";
import { boundChatInput } from "@/utils/providerInputBudget";

export const runtime = "nodejs";

/** Must stay above TEXT_PROVIDER_TIMEOUT_MS so a timed-out stream can refund. */
export const maxDuration = 120;

type ChatHistoryItem = { prompt: string; response: string };

const SYSTEM_PROMPT = "The user will ask you questions. Respond in a helpful way.";

function buildMessages(
  history: ChatHistoryItem[] | undefined,
  userText: string
): ModelMessage[] {
  const messages: ModelMessage[] = [];

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

export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return Response.json({ error: "Invalid chat request" }, { status: 400 });
    }
    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid chat request" }, { status: 400 });
    }
    const body = parsed.data;
    const messages = body.messages;
    const latestUser = [...messages].reverse().find((m) => m.role === "user");
    const userText = latestUser
      ? getMessageText({
          content: typeof latestUser.content === "string" ? latestUser.content : undefined,
          parts: latestUser.parts?.map((part) => ({ type: part.type, text: part.text })),
        }).trim()
      : "";

    if (!userText) {
      return Response.json({ error: "Missing user message" }, { status: 400 });
    }

    const bounded = boundChatInput(userText, body.history);
    if (!bounded.ok) {
      return Response.json({ error: bounded.error }, { status: 400 });
    }

    const uid = await requireAuthedUidFromRequest(req);
    const useCredits = body.useCredits !== false;

    const rateLimitResponse = await rateLimitMiddleware(uid, "chat");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const idempotencyKey = body.idempotencyKey
      ? generateClientIdempotencyKey(uid, body.idempotencyKey)
      : generateIdempotencyKey(uid, { userText: bounded.userText, modelKey: body.modelKey });

    // One refund id per debit: a retry with the same key after a refund is a
    // new charge and must be refundable again.
    const refundId = `refund_chat_${idempotencyKey}_${randomUUID()}`;
    let requestSettled = false;
    let creditsCharged = false;
    let successfullyStreamed = false;

    const settleFailure = async () => {
      if (requestSettled) return;
      requestSettled = true;

      if (!useCredits) return;

      try {
        if (creditsCharged) {
          await creditCredits(uid, CREDITS_COSTS.chatMessage, {
            reason: "chat_message_refund",
            tool: "chat",
            modelKey: body.modelKey,
            refId: idempotencyKey,
            deterministicId: refundId,
          });
        }
      } catch (refundError) {
        console.error("Chat refund failed:", refundError);
      }
      try {
        await markIdempotencyFailed(uid, idempotencyKey);
      } catch (idError) {
        console.error("Idempotency failure mark failed:", idError);
      }
    };

    const settleSuccess = async () => {
      if (requestSettled) return;
      requestSettled = true;
      if (!useCredits) return;
      try {
        await markIdempotencyComplete(uid, idempotencyKey);
      } catch (error) {
        console.error("Idempotency completion mark failed:", error);
      }
    };

    if (useCredits) {
      const balance = await getCredits(uid);
      if (balance < CREDITS_COSTS.chatMessage) {
        return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
      }

      const idempotencyResult = await debitCreditsIdempotent(
        uid,
        idempotencyKey,
        CREDITS_COSTS.chatMessage,
        {
          reason: "chat_message",
          tool: "chat",
          modelKey: body.modelKey,
          refId: idempotencyKey,
        }
      );

      if (!idempotencyResult.isNew) {
        const errorCode =
          idempotencyResult.status === "completed"
            ? "DUPLICATE_CHAT_REQUEST"
            : "CHAT_REQUEST_IN_PROGRESS";
        return Response.json({ error: errorCode }, { status: 409 });
      }
      creditsCharged = true;
    }

    // Balance is settled before the provider is constructed, so a short
    // balance returns 402 and never calls the model.
    const model = getTextModel({
      modelKey: body.modelKey,
      useCredits: body.useCredits,
      openaiApiKey: body.openaiApiKey,
      anthropicApiKey: body.anthropicApiKey,
      xaiApiKey: body.xaiApiKey,
      googleApiKey: body.googleApiKey,
    });

    // Abort controller wired to the incoming request and to the provider
    // timeout: if either fires we refund the credit and clear idempotency.
    const abortController = new AbortController();
    const forwardAbort = () => {
      if (!abortController.signal.aborted) abortController.abort();
    };
    req.signal.addEventListener("abort", forwardAbort, { once: true });
    AbortSignal.timeout(TEXT_PROVIDER_TIMEOUT_MS).addEventListener(
      "abort",
      forwardAbort,
      { once: true }
    );

    try {
      const result = streamText({
        model,
        instructions: SYSTEM_PROMPT,
        messages: buildMessages(bounded.history, bounded.userText),
        abortSignal: abortController.signal,
        onEnd: async ({ text }) => {
          successfullyStreamed = true;
          // A filtered or empty completion delivers nothing, so it is not charged.
          if (text.trim()) {
            await settleSuccess();
          } else {
            await settleFailure();
          }
        },
        onError: async ({ error }) => {
          console.error("Chat stream error:", error);
          await settleFailure();
        },
        onAbort: async () => {
          if (!successfullyStreamed) {
            await settleFailure();
          } else {
            await settleSuccess();
          }
        },
      });

      return createUIMessageStreamResponse({
        stream: toUIMessageStream({ stream: result.stream }),
      });
    } catch (error) {
      await settleFailure();
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("INSUFFICIENT_CREDITS")) {
      return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    console.error("Chat API error:", error);
    return Response.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
