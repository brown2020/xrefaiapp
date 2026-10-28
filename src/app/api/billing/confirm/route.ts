import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/firebaseAdmin";
import { fulfillPaidCheckoutSession } from "@/actions/stripeFulfillment";
import { PAYMENT_LOCK_TTL_MS } from "@/constants";
import { requireAuthedUidFromRequest } from "@/utils/requireAuthedRequest";
import { getStripe } from "@/utils/stripeServer";

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
    await adminDb.runTransaction(async (tx) => {
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
        acquiredAtServer: FieldValue.serverTimestamp(),
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

function isSafeFirestoreDocSegment(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    !value.includes("/") &&
    !value.includes("\\")
  );
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
    if (!isSafeFirestoreDocSegment(sessionId)) {
      return Response.json({ error: "Invalid sessionId" }, { status: 400 });
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

    const result = await fulfillPaidCheckoutSession(checkoutSession, uid);
    if (!result.ok) {
      return Response.json(
        { error: result.error, paymentStatus: result.paymentStatus },
        { status: result.status }
      );
    }

    return Response.json(
      {
        ok: true,
        pack: result.pack,
        alreadyProcessed: result.alreadyProcessed,
        creditsAdded: result.creditsAdded,
        creditsBalance: result.creditsBalance,
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
