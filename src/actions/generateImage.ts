"use server";

import { randomUUID } from "crypto";
import { adminBucket } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";
import { creditCredits, debitCreditsOrThrow } from "@/actions/serverCredits";
import { CREDITS_COSTS } from "@/constants/credits";
import {
  checkAndSetIdempotency,
  generateClientIdempotencyKey,
  generateIdempotencyKey,
  markIdempotencyComplete,
  markIdempotencyFailed,
} from "@/utils/idempotency";

type GenerateImageOptions = {
  useCredits?: boolean;
  fireworksApiKey?: string;
  /** Optional client-provided idempotency key to prevent double-charge on retries. */
  idempotencyKey?: string;
};

type GenerateImageResult =
  | { imageUrl: string; error?: undefined }
  | { imageUrl?: undefined; error: string };

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

    const apiKey = useCredits
      ? (process.env.FIREWORKS_API_KEY || "").trim()
      : (options?.fireworksApiKey || "").trim();

    if (!apiKey) {
      throw new Error(
        useCredits
          ? "Missing server Fireworks API key."
          : "Missing Fireworks API key (profile.fireworks_api_key)."
      );
    }

    if (useCredits) {
      idempotencyKey = options?.idempotencyKey
        ? generateClientIdempotencyKey(uid, options.idempotencyKey)
        : generateIdempotencyKey(uid, { message, tool: "image" });

      const idempotencyResult = await checkAndSetIdempotency(uid, idempotencyKey);
      if (!idempotencyResult.isNew) {
        return {
          error:
            idempotencyResult.status === "completed"
              ? "DUPLICATE_REQUEST"
              : "REQUEST_IN_PROGRESS",
        };
      }

      try {
        await debitCreditsOrThrow(uid, CREDITS_COSTS.imageGeneration, {
          reason: "image_generation",
          tool: "image",
        });
        creditsCharged = true;
      } catch (error) {
        await markIdempotencyFailed(uid, idempotencyKey).catch(() => undefined);
        throw error;
      }
    }

    const response = await fetch(
      `https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/stable-diffusion-xl-1024-v1-0`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "image/jpeg",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          sampler: null,
          samples: 1,
          steps: 30,
          seed: 0,
          style_preset: null,
          safety_check: false,
          prompt: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Something went wrong with Fireworks API");
    }

    const imageData = await response.arrayBuffer();
    const filename = `generated/${uid}/${Date.now()}_${randomUUID()}.jpg`;
    const file = adminBucket.file(filename);

    await file.save(Buffer.from(imageData), {
      contentType: "image/jpeg",
    });

    const signedUrls = await file.getSignedUrl({
      action: "read",
      expires: "03-17-2125",
    });

    const imageUrl = signedUrls[0];

    if (useCredits && idempotencyKey) {
      await markIdempotencyComplete(chargedUid, idempotencyKey).catch(() => undefined);
    }

    return { imageUrl };
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
