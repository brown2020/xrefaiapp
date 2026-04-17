"use server";

import crypto from "crypto";
import { admin, adminDb } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";
import { coerceCredits } from "@/utils/credits";
import { CREDIT_PACKS } from "@/constants/creditPacks";

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

/** Maximum credits allowed per IAP even if the signed payload asks for more. */
const MAX_IAP_CREDITS = Math.max(...CREDIT_PACKS.map((p) => p.credits)) * 2;

function requireIapSecret(): string {
  const secret = (process.env.IAP_WEBVIEW_SECRET || "").trim();
  if (!secret) {
    throw new Error("IAP_NOT_CONFIGURED");
  }
  return secret;
}

/**
 * HMAC over a JSON-encoded canonical form of the payload. Using JSON (rather
 * than pipe-separated fields) means that values containing the separator
 * character cannot be moved between fields without invalidating the signature.
 */
function computeSignature(secret: string, input: IapConfirmInput): string {
  const canonical = JSON.stringify({
    transactionId: String(input.transactionId),
    productId: String(input.productId),
    amount: Number(input.amount),
    currency: String(input.currency).toUpperCase(),
    platform: String(input.platform),
    credits: Number(input.credits),
    ts: Number(input.ts),
  });

  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function normalizeCurrency(value: unknown): string {
  if (typeof value !== "string") return "USD";
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : "USD";
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

  const requestedCredits = Math.floor(input.credits);
  if (requestedCredits > MAX_IAP_CREDITS) {
    throw new Error("IAP_CREDITS_EXCEEDS_MAX");
  }

  const secret = requireIapSecret();
  const expected = computeSignature(secret, input);
  if (!timingSafeEqualHex(expected, input.signature)) {
    throw new Error("INVALID_IAP_SIGNATURE");
  }

  const now = Date.now();
  const maxSkewMs = 5 * 60 * 1000;
  if (!Number.isFinite(input.ts) || Math.abs(now - input.ts) > maxSkewMs) {
    throw new Error("INVALID_IAP_TIMESTAMP");
  }

  const normalizedCurrency = normalizeCurrency(input.currency);
  const paymentRef = adminDb.doc(
    `users/${uid}/payments/iap_${input.transactionId}`
  );
  const globalClaimRef = adminDb.doc(`iapTransactions/${input.transactionId}`);
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const ledgerRef = adminDb.doc(
    `users/${uid}/creditsLedger/iap_${input.transactionId}`
  );

  return await adminDb.runTransaction(
    async (tx: FirebaseFirestore.Transaction) => {
      const globalClaimSnap = await tx.get(globalClaimRef);
      if (globalClaimSnap.exists) {
        const claimedByUid = String(globalClaimSnap.data()?.uid || "");
        if (claimedByUid && claimedByUid !== uid) {
          throw new Error("IAP_ALREADY_CLAIMED");
        }
      }

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
      const nextCredits = currentCredits + requestedCredits;
      if (!Number.isFinite(nextCredits)) throw new Error("Invalid credits value");

      tx.set(
        globalClaimRef,
        {
          uid,
          platform: input.platform,
          productId: input.productId,
          transactionId: input.transactionId,
          claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(
        paymentRef,
        {
          id: `iap_${input.transactionId}`,
          amount: Math.max(0, Math.floor(Number(input.amount) || 0)),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "succeeded",
          mode: "iap",
          platform: String(input.platform || "ios"),
          productId: String(input.productId || "iap"),
          currency: normalizedCurrency,
          transactionId: input.transactionId,
        },
        { merge: true }
      );

      tx.set(profileRef, { credits: nextCredits }, { merge: true });

      tx.set(
        ledgerRef,
        {
          type: "credit",
          amount: requestedCredits,
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
        creditsAdded: requestedCredits,
        creditsBalance: nextCredits,
      };
    }
  );
}
