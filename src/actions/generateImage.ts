"use server";

import { adminBucket } from "@/firebase/firebaseAdmin";
import * as dotenv from "dotenv";

dotenv.config();

export async function generateImage(message: string, uid: string) {
  console.log("generateImage called with prompt:", message, "and uid:", uid);

  try {
    const response = await fetch(
      `https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/stable-diffusion-xl-1024-v1-0`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "image/jpeg",
          Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
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

    console.log("Fireworks API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Fireworks API error text:", errorText);
      throw new Error("Something went wrong with Fireworks API");
    }

    const imageData = await response.arrayBuffer();
    console.log("Image data fetched from Fireworks API.");

    const filename = `generated/${uid}/${Date.now()}.jpg`;
    const file = adminBucket.file(filename);

    console.log("Saving image to bucket with filename:", filename);

    await file.save(Buffer.from(imageData), {
      contentType: "image/jpeg",
    });

    console.log("Image successfully saved to bucket.");

    const signedUrls = await file.getSignedUrl({
      action: "read",
      expires: "03-17-2125",
    });

    console.log("Signed URL generated:", signedUrls[0]);

    const imageUrl = signedUrls[0];
    return { imageUrl };
  } catch (error: unknown) {
    console.log("Error in generateImage:", error);
    if (error instanceof Error) {
      return { error: error.message };
    } else {
      return { error: "An unknown error occurred" };
    }
  }
}
