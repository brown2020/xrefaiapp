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
import { getMessageText } from "@/utils/messages";

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

    const idempotencyKey = body.idempotencyKey
      ? generateClientIdempotencyKey(uid, body.idempotencyKey)
      : generateIdempotencyKey(uid, { userText, modelKey: body.modelKey });

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
            deterministicId: `refund_chat_${idempotencyKey}`,
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
      const idempotencyResult = await checkAndSetIdempotency(uid, idempotencyKey);

      if (!idempotencyResult.isNew) {
        const errorCode =
          idempotencyResult.status === "completed"
            ? "DUPLICATE_CHAT_REQUEST"
            : "CHAT_REQUEST_IN_PROGRESS";
        return Response.json({ error: errorCode }, { status: 409 });
      }

      try {
        await debitCreditsOrThrow(uid, CREDITS_COSTS.chatMessage, {
          reason: "chat_message",
          tool: "chat",
          modelKey: body.modelKey,
          refId: idempotencyKey,
        });
        creditsCharged = true;
      } catch (error) {
        await markIdempotencyFailed(uid, idempotencyKey).catch(() => undefined);
        throw error;
      }
    }

    // Abort controller wired to the incoming request: if the client
    // disconnects mid-stream we refund the credit and clear the idempotency
    // marker so the user can retry.
    const abortController = new AbortController();
    const forwardAbort = () => {
      if (!abortController.signal.aborted) abortController.abort();
    };
    req.signal.addEventListener("abort", forwardAbort, { once: true });

    try {
      const result = streamText({
        model,
        messages: buildMessages(body.history, userText),
        abortSignal: abortController.signal,
        onFinish: async () => {
          successfullyStreamed = true;
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
        onAbort: async () => {
          if (!successfullyStreamed) {
            await settleFailure();
          } else {
            await settleSuccess();
          }
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
