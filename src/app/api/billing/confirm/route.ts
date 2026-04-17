import { NextRequest } from "next/server";
import Stripe from "stripe";
import { adminDb, admin } from "@/firebase/firebaseAdmin";
import { CREDIT_PACKS } from "@/constants/creditPacks";
import { coerceCredits } from "@/utils/credits";
import { requireAuthedUidFromRequest } from "@/utils/requireAuthedRequest";
import { PAYMENT_LOCK_TTL_MS } from "@/constants";

export const runtime = "nodejs";

/**
 * Attempts to acquire a distributed lock for payment processing.
 * Returns true if lock acquired, false if another request is processing.
 *
 * Uses `Date.now()` (a number) rather than a server timestamp so that the
 * freshly-written `acquiredAt` is immediately comparable within the same
 * transaction — `serverTimestamp()` resolves to null locally until commit,
 * which previously made the expiry check unreliable.
 */
async function tryAcquirePaymentLock(uid: string, sessionId: string): Promise<boolean> {
  const lockRef = adminDb.doc(`users/${uid}/locks/payment_${sessionId}`);
  const now = Date.now();

  try {
    await adminDb.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
      const lockSnap = await tx.get(lockRef);

      if (lockSnap.exists) {
        const lockData = lockSnap.data() as { acquiredAt?: number } | undefined;
        const acquiredAt = Number(lockData?.acquiredAt ?? 0);

        if (Number.isFinite(acquiredAt) && now - acquiredAt < PAYMENT_LOCK_TTL_MS) {
          throw new Error("LOCK_HELD");
        }
      }

      tx.set(lockRef, {
        acquiredAt: now,
        acquiredAtServer: admin.firestore.FieldValue.serverTimestamp(),
        uid,
        sessionId,
      });
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === "LOCK_HELD") {
      return false;
    }
    throw error;
  }
}

async function releasePaymentLock(uid: string, sessionId: string): Promise<void> {
  const lockRef = adminDb.doc(`users/${uid}/locks/payment_${sessionId}`);
  try {
    await lockRef.delete();
  } catch {
    // Ignore errors on lock release
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

let stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (stripe) return stripe;
  stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return stripe;
}

export async function POST(req: NextRequest) {
  let uid: string | null = null;
  let sessionId: string | null = null;
  let lockAcquired = false;

  try {
    uid = await requireAuthedUidFromRequest(req);

    const body = (await req.json().catch(() => null)) as
      | { sessionId?: string }
      | null;
    sessionId = body?.sessionId?.toString() ?? "";
    if (!sessionId) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
    }

    lockAcquired = await tryAcquirePaymentLock(uid, sessionId);
    if (!lockAcquired) {
      return Response.json(
        { error: "Payment processing in progress", status: "processing" },
        { status: 409 }
      );
    }

    const checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    const metadataUid = checkoutSession.metadata?.uid;
    if (!metadataUid || metadataUid !== uid) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (checkoutSession.payment_status !== "paid") {
      return Response.json(
        { error: "Payment not completed", paymentStatus: checkoutSession.payment_status },
        { status: 402 }
      );
    }

    const packId = checkoutSession.metadata?.packId ?? "";
    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return Response.json({ error: "Unknown packId on session metadata" }, { status: 400 });
    }

    const amountTotal = checkoutSession.amount_total ?? 0;
    if (amountTotal !== pack.amountCents) {
      return Response.json(
        { error: "Amount mismatch", expectedUsdCents: pack.amountCents, amountTotal },
        { status: 400 }
      );
    }

    const paymentRef = adminDb.doc(`users/${uid}/payments/checkout_${sessionId}`);
    const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
    const ledgerRef = adminDb.doc(`users/${uid}/creditsLedger/stripe_checkout_${sessionId}`);

    const res = await adminDb.runTransaction(
      async (tx: FirebaseFirestore.Transaction) => {
        const existingPaymentSnap = await tx.get(paymentRef);
        if (existingPaymentSnap.exists) {
          const existing = existingPaymentSnap.data() as
            | { status?: string; amount?: number }
            | undefined;
          if (existing?.status === "paid" || existing?.status === "succeeded") {
            const profileSnap = await tx.get(profileRef);
            const currentCredits = coerceCredits(
              profileSnap.exists ? profileSnap.data()?.credits : 0,
              0
            );
            return { alreadyProcessed: true, creditsAdded: 0, creditsBalance: currentCredits };
          }
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
            amount: amountTotal,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: checkoutSession.payment_status,
            mode: "stripe_checkout",
            platform: "web",
            productId: pack.id,
            currency: "USD",
            stripeCheckoutSessionId: checkoutSession.id,
            stripePaymentIntentId:
              typeof checkoutSession.payment_intent === "object" &&
              checkoutSession.payment_intent !== null &&
              "id" in checkoutSession.payment_intent
                ? (checkoutSession.payment_intent as Stripe.PaymentIntent).id
                : (typeof checkoutSession.payment_intent === "string"
                    ? checkoutSession.payment_intent
                    : null),
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
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          alreadyProcessed: false,
          creditsAdded: pack.credits,
          creditsBalance: nextCredits,
        };
      }
    );

    return Response.json(
      {
        ok: true,
        pack: { id: pack.id, name: pack.label, usdCents: pack.amountCents },
        ...res,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error confirming Stripe checkout session:", error);
    return Response.json({ error: "Failed to confirm purchase" }, { status: 500 });
  } finally {
    if (lockAcquired && uid && sessionId) {
      await releasePaymentLock(uid, sessionId);
    }
  }
}
