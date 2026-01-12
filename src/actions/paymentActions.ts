// paymentActions.ts
"use server";

import Stripe from "stripe";
import { cookies } from "next/headers";
import { adminAuth, adminDb, admin } from "@/firebase/firebaseAdmin";
import { getAuthCookieName } from "@/utils/getAuthCookieName";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

async function requireAuthedUid(): Promise<string> {
  const cookieName = getAuthCookieName();
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }
  const decoded = await adminAuth.verifyIdToken(token);
  if (!decoded?.uid) {
    throw new Error("AUTH_REQUIRED");
  }
  return decoded.uid;
}

function computeCreditsForAmountCents(amountCents: number): number {
  // Current product is fixed at $99.99 for 10,000 credits.
  // Keep this mapping server-side so clients can't "choose" credits.
  if (amountCents === 9999) return 10_000;
  // Fallback: 1 cent == 1 credit.
  return Math.max(0, Math.floor(amountCents));
}

export async function createPaymentIntent(amount: number) {
  const product = process.env.NEXT_PUBLIC_STRIPE_PRODUCT_NAME;

  try {
    if (!product) throw new Error("Stripe product name is not defined");
    const uid = await requireAuthedUid();
    const creditsToAdd = computeCreditsForAmountCents(amount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: { product, uid, credits: String(creditsToAdd) },
      description: `Payment for product ${process.env.NEXT_PUBLIC_STRIPE_PRODUCT_NAME}`,
    });

    return paymentIntent.client_secret;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw new Error("Failed to create payment intent");
  }
}

export async function validatePaymentIntent(paymentIntentId: string) {
  try {
    const uid = await requireAuthedUid();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      if (paymentIntent.metadata?.uid && paymentIntent.metadata.uid !== uid) {
        throw new Error("PAYMENT_USER_MISMATCH");
      }
      // Convert the Stripe object to a plain object
      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        created: paymentIntent.created,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
      };
    } else {
      throw new Error("Payment was not successful");
    }
  } catch (error) {
    console.error("Error validating payment intent:", error);
    throw new Error("Failed to validate payment intent");
  }
}

export async function fulfillStripePaymentIntent(paymentIntentId: string): Promise<{
  id: string;
  amount: number;
  currency: string;
  createdMs: number | null;
  creditsAdded: number;
  alreadyProcessed: boolean;
}> {
  const uid = await requireAuthedUid();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new Error("PAYMENT_NOT_SUCCEEDED");
  }
  if (paymentIntent.metadata?.uid && paymentIntent.metadata.uid !== uid) {
    throw new Error("PAYMENT_USER_MISMATCH");
  }

  const creditsFromMetadata = Number(paymentIntent.metadata?.credits);
  const creditsToAdd = Number.isFinite(creditsFromMetadata)
    ? Math.max(0, Math.floor(creditsFromMetadata))
    : computeCreditsForAmountCents(paymentIntent.amount);

  const paymentRef = adminDb.doc(`users/${uid}/payments/${paymentIntent.id}`);
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);

  const res = await adminDb.runTransaction(async (tx) => {
    const existingPaymentSnap = await tx.get(paymentRef);
    if (existingPaymentSnap.exists) {
      const existing = existingPaymentSnap.data() as { status?: string; amount?: number };
      if (existing?.status === "succeeded") {
        return {
          alreadyProcessed: true,
          creditsAdded: 0,
          amount: typeof existing.amount === "number" ? existing.amount : paymentIntent.amount,
        };
      }
    }

    // Record payment (idempotent doc id).
    tx.set(
      paymentRef,
      {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: paymentIntent.status,
        mode: "stripe",
        platform: "web",
        productId: "payment_gateway",
        currency: (paymentIntent.currency || "usd").toUpperCase(),
      },
      { merge: true }
    );

    // Increment credits.
    tx.set(
      profileRef,
      { credits: admin.firestore.FieldValue.increment(creditsToAdd) },
      { merge: true }
    );

    return { alreadyProcessed: false, creditsAdded: creditsToAdd, amount: paymentIntent.amount };
  });

  return {
    id: paymentIntent.id,
    amount: res.amount,
    currency: (paymentIntent.currency || "usd").toUpperCase(),
    createdMs: paymentIntent.created ? paymentIntent.created * 1000 : null,
    creditsAdded: res.creditsAdded,
    alreadyProcessed: res.alreadyProcessed,
  };
}
