"use server";

import crypto from "crypto";
import { admin, adminDb } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";
import { coerceCredits } from "@/utils/credits";
import { resolveIapCreditGrant } from "@/utils/iapGrant";
import { verifyIapReceipt } from "@/utils/iapReceipt";
import { signIapPayload, type IapSignedFields } from "@/utils/iapSignature";
import { iapConfirmSchema } from "@/utils/actionContracts";

export type IapConfirmInput = IapSignedFields & {
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

function isSafeFirestoreDocSegment(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    !value.includes("/") &&
    !value.includes("\\")
  );
}

export async function confirmIapPurchase(
  input: IapConfirmInput
): Promise<IapConfirmResult> {
  const uid = await requireAuthedUid();
  const parsed = iapConfirmSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("INVALID_IAP_MESSAGE");
  }
  const payload = parsed.data;
  const transactionId = payload.transactionId;

  if (!isSafeFirestoreDocSegment(transactionId)) {
    throw new Error("INVALID_IAP_MESSAGE");
  }

  const secret = requireIapSecret();
  const expected = signIapPayload(secret, {
    transactionId,
    productId: payload.productId,
    amount: payload.amount,
    currency: payload.currency,
    platform: payload.platform,
    credits: payload.credits,
    ts: payload.ts,
    receipt: payload.receipt,
  });
  if (!timingSafeEqualHex(expected, payload.signature)) {
    throw new Error("INVALID_IAP_SIGNATURE");
  }

  const grant = resolveIapCreditGrant(payload.productId, payload.credits);
  if (!grant.ok) {
    throw new Error(grant.error);
  }

  const now = Date.now();
  const maxSkewMs = 5 * 60 * 1000;
  if (!Number.isFinite(payload.ts) || Math.abs(now - payload.ts) > maxSkewMs) {
    throw new Error("INVALID_IAP_TIMESTAMP");
  }

  await verifyIapReceipt({
    platform: payload.platform,
    receipt: payload.receipt,
    productId: grant.packId,
    transactionId,
  });

  const normalizedCurrency = normalizeCurrency(payload.currency);
  const paymentRef = adminDb.doc(
    `users/${uid}/payments/iap_${transactionId}`
  );
  const globalClaimRef = adminDb.doc(`iapTransactions/${transactionId}`);
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const ledgerRef = adminDb.doc(
    `users/${uid}/creditsLedger/iap_${transactionId}`
  );

  return await adminDb.runTransaction(
    async (tx: FirebaseFirestore.Transaction) => {
      const globalClaimSnap = await tx.get(globalClaimRef);
      if (globalClaimSnap.exists) {
        const claimedByUid = String(globalClaimSnap.data()?.uid || "");
        // A claim blocks every account, including the original claimant.
        // Re-fulfillment requires the payment document to be the only record,
        // so deleting that document must not grant the credits again.
        if (claimedByUid !== uid) {
          throw new Error("IAP_ALREADY_CLAIMED");
        }
        const profileSnap = await tx.get(profileRef);
        const currentCredits = coerceCredits(
          profileSnap.exists ? profileSnap.data()?.credits : 0,
          0
        );
        return {
          ok: true as const,
          alreadyProcessed: true,
          creditsAdded: 0,
          creditsBalance: currentCredits,
        };
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
      const nextCredits = currentCredits + grant.credits;
      if (!Number.isFinite(nextCredits)) throw new Error("Invalid credits value");

      tx.set(
        globalClaimRef,
        {
          uid,
          platform: input.platform,
          productId: grant.packId,
          transactionId,
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
          productId: grant.packId,
          currency: normalizedCurrency,
          transactionId,
        },
        { merge: true }
      );

      tx.set(profileRef, { credits: nextCredits }, { merge: true });

      tx.set(
        ledgerRef,
        {
          type: "credit",
          amount: grant.credits,
          reason: "purchase",
          tool: "iap",
          modelKey: null,
          refId: transactionId,
          balanceAfter: nextCredits,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        ok: true,
        alreadyProcessed: false,
        creditsAdded: grant.credits,
        creditsBalance: nextCredits,
      };
    }
  );
}
