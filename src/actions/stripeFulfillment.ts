import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminDb } from "@/firebase/firebaseAdmin";
import { CREDIT_PACKS } from "@/constants/creditPacks";
import { coerceCredits } from "@/utils/credits";
import { paidCheckoutMatchesPack } from "@/utils/stripeCheckout";

export type StripeFulfillResult =
  | {
      ok: true;
      alreadyProcessed: boolean;
      creditsAdded: number;
      creditsBalance: number;
      pack: { id: string; name: string; usdCents: number };
    }
  | { ok: false; status: number; error: string; paymentStatus?: string };

function isSafeDocId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    !value.includes("/") &&
    !value.includes("\\")
  );
}

export function paymentIntentIdFrom(
  paymentIntent: Stripe.Checkout.Session["payment_intent"] | Stripe.Charge["payment_intent"]
): string | null {
  if (typeof paymentIntent === "string") return isSafeDocId(paymentIntent) ? paymentIntent : null;
  if (
    paymentIntent &&
    typeof paymentIntent === "object" &&
    "id" in paymentIntent &&
    typeof paymentIntent.id === "string" &&
    isSafeDocId(paymentIntent.id)
  ) {
    return paymentIntent.id;
  }
  return null;
}

/**
 * Grants the catalog pack for a paid Checkout Session.
 * Safe to call from the return page and from a signed webhook: the payment
 * document and ledger id make a second call a no-op.
 */
export async function fulfillPaidCheckoutSession(
  checkoutSession: Stripe.Checkout.Session,
  expectedUid?: string
): Promise<StripeFulfillResult> {
  const sessionId = checkoutSession.id;
  if (!isSafeDocId(sessionId)) {
    return { ok: false, status: 400, error: "Invalid sessionId" };
  }

  const metadataUid = checkoutSession.metadata?.uid ?? "";
  if (!metadataUid || !isSafeDocId(metadataUid)) {
    return { ok: false, status: 400, error: "Missing session uid" };
  }
  if (expectedUid && metadataUid !== expectedUid) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (checkoutSession.payment_status !== "paid") {
    return {
      ok: false,
      status: 402,
      error: "Payment not completed",
      paymentStatus: checkoutSession.payment_status,
    };
  }

  const packId = checkoutSession.metadata?.packId ?? "";
  const pack = CREDIT_PACKS.find((candidate) => candidate.id === packId);
  if (!pack) {
    return { ok: false, status: 400, error: "Unknown packId on session metadata" };
  }
  if (!paidCheckoutMatchesPack(checkoutSession, pack)) {
    return { ok: false, status: 400, error: "Amount mismatch" };
  }

  const uid = metadataUid;
  const paymentIntentId = paymentIntentIdFrom(checkoutSession.payment_intent);
  const paymentRef = adminDb.doc(`users/${uid}/payments/checkout_${sessionId}`);
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const ledgerRef = adminDb.doc(`users/${uid}/creditsLedger/stripe_checkout_${sessionId}`);
  const intentRef = paymentIntentId
    ? adminDb.doc(`stripePaymentIntents/${paymentIntentId}`)
    : null;

  const res = await adminDb.runTransaction(async (tx) => {
    const existingPaymentSnap = await tx.get(paymentRef);
    if (intentRef) await tx.get(intentRef);
    // Any payment doc means this session already granted. A later refund
    // rewrites status and must not make the session grantable again.
    if (existingPaymentSnap.exists) {
      const profileSnap = await tx.get(profileRef);
      const currentCredits = coerceCredits(
        profileSnap.exists ? profileSnap.data()?.credits : 0,
        0
      );
      return { alreadyProcessed: true, creditsAdded: 0, creditsBalance: currentCredits };
    }

    const profileSnap = await tx.get(profileRef);
    const currentCredits = coerceCredits(
      profileSnap.exists ? profileSnap.data()?.credits : 0,
      0
    );
    const nextCredits = currentCredits + pack.credits;
    if (!Number.isFinite(nextCredits)) throw new Error("Invalid credits value");

    tx.set(
      paymentRef,
      {
        id: `checkout_${sessionId}`,
        amount: pack.amountCents,
        createdAt: FieldValue.serverTimestamp(),
        status: checkoutSession.payment_status,
        mode: "stripe_checkout",
        platform: "web",
        productId: pack.id,
        currency: "USD",
        stripeCheckoutSessionId: checkoutSession.id,
        stripePaymentIntentId: paymentIntentId,
      },
      { merge: true }
    );

    tx.set(profileRef, { credits: nextCredits }, { merge: true });

    tx.set(
      ledgerRef,
      {
        type: "credit",
        amount: pack.credits,
        reason: "purchase",
        tool: "stripe",
        modelKey: null,
        refId: checkoutSession.id,
        balanceAfter: nextCredits,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (intentRef && paymentIntentId) {
      tx.set(
        intentRef,
        {
          uid,
          sessionId,
          packId: pack.id,
          credits: pack.credits,
          amountCents: pack.amountCents,
          currency: "usd",
          creditsReversed: 0,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return {
      alreadyProcessed: false,
      creditsAdded: pack.credits,
      creditsBalance: nextCredits,
    };
  });

  return {
    ok: true,
    pack: { id: pack.id, name: pack.label, usdCents: pack.amountCents },
    ...res,
  };
}

/**
 * Removes credits after a refund or dispute. The same Stripe event is a no-op
 * the second time. The balance never goes below zero; a spent balance cannot
 * be pulled further.
 */
export async function clawbackStripeCharge(input: {
  paymentIntentId: string;
  eventId: string;
  reason: "refund" | "dispute";
  amountRefunded: number | null;
  amountTotal: number | null;
}): Promise<void> {
  if (!isSafeDocId(input.paymentIntentId) || !isSafeDocId(input.eventId)) return;

  const intentRef = adminDb.doc(`stripePaymentIntents/${input.paymentIntentId}`);
  const clawRef = adminDb.doc(`stripeClawbacks/${input.eventId}`);

  await adminDb.runTransaction(async (tx) => {
    const clawSnap = await tx.get(clawRef);
    if (clawSnap.exists) return;
    const intentSnap = await tx.get(intentRef);
    if (!intentSnap.exists) {
      tx.set(clawRef, {
        paymentIntentId: input.paymentIntentId,
        reason: input.reason,
        skipped: "unknown_payment",
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const intent = intentSnap.data() as {
      uid?: string;
      sessionId?: string;
      credits?: number;
      creditsReversed?: number;
    };
    const uid = typeof intent.uid === "string" ? intent.uid : "";
    if (!isSafeDocId(uid)) return;

    const granted = coerceCredits(intent.credits, 0);
    const reversed = coerceCredits(intent.creditsReversed, 0);
    const remaining = Math.max(0, granted - reversed);
    let target = remaining;
    if (
      input.reason === "refund" &&
      input.amountTotal &&
      input.amountTotal > 0 &&
      input.amountRefunded !== null &&
      Number.isFinite(input.amountRefunded)
    ) {
      const cumulative = Math.min(
        granted,
        Math.round((granted * input.amountRefunded) / input.amountTotal)
      );
      target = Math.max(0, Math.min(remaining, cumulative - reversed));
    }

    const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
    const profileSnap = await tx.get(profileRef);
    const current = coerceCredits(profileSnap.exists ? profileSnap.data()?.credits : 0, 0);
    const debit = Math.min(target, current);
    const next = current - debit;

    if (debit > 0) {
      tx.set(profileRef, { credits: next }, { merge: true });
      tx.set(
        adminDb.doc(`users/${uid}/creditsLedger/stripe_clawback_${input.eventId}`),
        {
          type: "debit",
          amount: debit,
          reason: input.reason === "refund" ? "stripe_refund" : "stripe_dispute",
          tool: "stripe",
          modelKey: null,
          refId: input.paymentIntentId,
          balanceAfter: next,
          createdAt: FieldValue.serverTimestamp(),
        }
      );
    }

    if (intent.sessionId && isSafeDocId(intent.sessionId)) {
      tx.set(
        adminDb.doc(`users/${uid}/payments/checkout_${intent.sessionId}`),
        {
          status: input.reason === "refund" ? "refunded" : "disputed",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    tx.set(
      intentRef,
      { creditsReversed: reversed + target },
      { merge: true }
    );
    tx.set(clawRef, {
      uid,
      paymentIntentId: input.paymentIntentId,
      reason: input.reason,
      debit,
      target,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}
