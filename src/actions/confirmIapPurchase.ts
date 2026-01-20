"use server";

import crypto from "crypto";
import { admin, adminDb } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";

export type IapConfirmInput = {
  transactionId: string;
  productId: string;
  amount: number;
  currency: string;
  platform: string;
  credits: number;
  ts: number;
  signature: string;
};

type IapConfirmResult = {
  ok: true;
  alreadyProcessed: boolean;
  creditsAdded: number;
  creditsBalance: number;
};

function requireIapSecret(): string {
  const secret = (process.env.IAP_WEBVIEW_SECRET || "").trim();
  if (!secret) {
    throw new Error("IAP_NOT_CONFIGURED");
  }
  return secret;
}

function computeSignature(secret: string, input: IapConfirmInput): string {
  const payload = [
    input.transactionId,
    input.productId,
    String(input.amount),
    input.currency,
    input.platform,
    String(input.credits),
    String(input.ts),
  ].join("|");

  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function coerceCredits(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export async function confirmIapPurchase(
  input: IapConfirmInput
): Promise<IapConfirmResult> {
  const uid = await requireAuthedUid();

  if (!input.transactionId || !input.signature) {
    throw new Error("INVALID_IAP_MESSAGE");
  }
  if (!Number.isFinite(input.credits) || input.credits <= 0) {
    throw new Error("INVALID_IAP_CREDITS");
  }

  const secret = requireIapSecret();
  const expected = computeSignature(secret, input);
  if (expected !== input.signature) {
    throw new Error("INVALID_IAP_SIGNATURE");
  }

  const now = Date.now();
  const maxSkewMs = 5 * 60 * 1000;
  if (!Number.isFinite(input.ts) || Math.abs(now - input.ts) > maxSkewMs) {
    throw new Error("INVALID_IAP_TIMESTAMP");
  }

  const paymentRef = adminDb.doc(
    `users/${uid}/payments/iap_${input.transactionId}`
  );
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const ledgerRef = adminDb.doc(
    `users/${uid}/creditsLedger/iap_${input.transactionId}`
  );

  return await adminDb.runTransaction(async (tx) => {
    const existingPaymentSnap = await tx.get(paymentRef);
    if (existingPaymentSnap.exists) {
      const profileSnap = await tx.get(profileRef);
      const currentCredits = coerceCredits(
        profileSnap.exists ? profileSnap.data()?.credits : 0,
        0
      );
      return {
        ok: true,
        alreadyProcessed: true,
        creditsAdded: 0,
        creditsBalance: currentCredits,
      };
    }

    const profileSnap = await tx.get(profileRef);
    const currentCredits = coerceCredits(
      profileSnap.exists ? profileSnap.data()?.credits : 0,
      0
    );
    const nextCredits = currentCredits + input.credits;
    if (!Number.isFinite(nextCredits)) throw new Error("Invalid credits value");

    tx.set(
      paymentRef,
      {
        id: `iap_${input.transactionId}`,
        amount: input.amount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "succeeded",
        mode: "iap",
        platform: input.platform,
        productId: input.productId,
        currency: input.currency?.toUpperCase?.() || "USD",
        transactionId: input.transactionId,
      },
      { merge: true }
    );

    tx.set(profileRef, { credits: nextCredits }, { merge: true });

    tx.set(
      ledgerRef,
      {
        type: "credit",
        amount: input.credits,
        reason: "purchase",
        tool: "iap",
        modelKey: null,
        refId: input.transactionId,
        balanceAfter: nextCredits,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      ok: true,
      alreadyProcessed: false,
      creditsAdded: input.credits,
      creditsBalance: nextCredits,
    };
  });
}
