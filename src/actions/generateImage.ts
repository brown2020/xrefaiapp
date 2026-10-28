"use server";

import { randomUUID } from "crypto";
import { generateImage as generateImageWithModel } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { IMAGE_MODEL_ID } from "@/ai/models";
import { adminBucket } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";
import { creditCredits, debitCreditsIdempotent } from "@/actions/serverCredits";
import { CREDITS_COSTS } from "@/constants/credits";
import {
  generateClientIdempotencyKey,
  generateIdempotencyKey,
  markIdempotencyComplete,
  markIdempotencyFailed,
} from "@/utils/idempotency";
import { IMAGE_READ_URL_TTL_MS } from "@/utils/generatedImagePath";
import { checkRateLimit } from "@/utils/rateLimit";
import {
  classifyImageProviderError,
  IMAGE_MISSING_OPENAI_KEY,
} from "@/utils/imageErrors";

type GenerateImageOptions = {
  useCredits?: boolean;
  openaiApiKey?: string;
  /** Optional client-provided idempotency key to prevent double-charge on retries. */
  idempotencyKey?: string;
};

type GenerateImageResult =
  | { imageUrl: string; storagePath: string; error?: undefined }
  | { imageUrl?: undefined; storagePath?: undefined; error: string };

export async function generateImage(
  message: string,
  options?: GenerateImageOptions
): Promise<GenerateImageResult> {
  const useCredits = options?.useCredits !== false;
  const refundId = `refund_image_${randomUUID()}`;

  let chargedUid = "";
  let creditsCharged = false;
  let idempotencyKey = "";

  try {
    const uid = await requireAuthedUid();
    chargedUid = uid;

    const rateLimit = await checkRateLimit(uid, "image");
    if (!rateLimit.allowed) {
      return { error: "RATE_LIMITED" };
    }

    const userApiKey = (options?.openaiApiKey || "").trim();
    if (!useCredits && !userApiKey) {
      return { error: IMAGE_MISSING_OPENAI_KEY };
    }
    const imageModel = useCredits
      ? openai.image(IMAGE_MODEL_ID)
      : createOpenAI({ apiKey: userApiKey }).image(IMAGE_MODEL_ID);

    if (useCredits) {
      idempotencyKey = options?.idempotencyKey
        ? generateClientIdempotencyKey(uid, options.idempotencyKey)
        : generateIdempotencyKey(uid, { message, tool: "image" });

      const idempotencyResult = await debitCreditsIdempotent(
        uid,
        idempotencyKey,
        CREDITS_COSTS.imageGeneration,
        {
          reason: "image_generation",
          tool: "image",
          refId: idempotencyKey,
        }
      );
      if (!idempotencyResult.isNew) {
        return {
          error:
            idempotencyResult.status === "completed"
              ? "DUPLICATE_REQUEST"
              : "REQUEST_IN_PROGRESS",
        };
      }
      creditsCharged = true;
    }

    let imageUrl: string;
    let storagePath: string;
    try {
      const stored = await renderAndStoreImage(uid, message, imageModel);
      imageUrl = stored.imageUrl;
      storagePath = stored.storagePath;
    } catch (providerError) {
      const detail =
        providerError instanceof Error ? providerError.message : String(providerError);
      console.error("Image generation failed:", detail);
      throw new Error(classifyImageProviderError(detail), { cause: providerError });
    }

    if (useCredits && idempotencyKey) {
      await markIdempotencyComplete(chargedUid, idempotencyKey).catch(() => undefined);
    }

    return { imageUrl, storagePath };
  } catch (error: unknown) {
    if (useCredits && chargedUid) {
      if (creditsCharged) {
        try {
          await creditCredits(chargedUid, CREDITS_COSTS.imageGeneration, {
            reason: "image_generation_refund",
            tool: "image",
            deterministicId: refundId,
          });
        } catch (refundError) {
          console.error("Error refunding image generation credits:", refundError);
        }
      }
      if (idempotencyKey) {
        await markIdempotencyFailed(chargedUid, idempotencyKey).catch(() => undefined);
      }
    }
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { error: message };
  }
}

/** Must end before the /tools route's `maxDuration` (120s) so the refund path still runs. */
const IMAGE_PROVIDER_TIMEOUT_MS = 100_000;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

async function renderAndStoreImage(
  uid: string,
  prompt: string,
  model: Parameters<typeof generateImageWithModel>[0]["model"]
): Promise<{ imageUrl: string; storagePath: string }> {
  const { image } = await generateImageWithModel({
    model,
    prompt,
    size: "1024x1024",
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(IMAGE_PROVIDER_TIMEOUT_MS),
    providerOptions: { openai: { quality: "medium", outputFormat: "jpeg" } },
  });

  const extension = IMAGE_EXTENSIONS[image.mediaType] ?? "png";
  const file = adminBucket.file(
    `generated/${uid}/${Date.now()}_${randomUUID()}.${extension}`
  );
  await file.save(Buffer.from(image.uint8Array), { contentType: image.mediaType });

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    version: "v4",
    expires: Date.now() + IMAGE_READ_URL_TTL_MS,
  });
  return { imageUrl: signedUrl, storagePath: file.name };
}
