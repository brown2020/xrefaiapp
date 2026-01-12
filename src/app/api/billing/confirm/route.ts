import { NextRequest } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { adminAuth, adminDb, admin } from "@/firebase/firebaseAdmin";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { CREDIT_PACKS } from "@/constants/creditPacks";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

let stripe: Stripe | null = null;
function getStripe() {
  if (stripe) return stripe;
  stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return stripe;
}

function coerceCredits(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

async function requireAuthedUid(req: NextRequest): Promise<string> {
  const cookieName = getAuthCookieName();
  const token = (await cookies()).get(cookieName)?.value;
  const bearer = req.headers.get("authorization") || req.headers.get("Authorization");
  const bearerToken =
    bearer && bearer.toLowerCase().startsWith("bearer ")
      ? bearer.slice("bearer ".length).trim()
      : "";

  const idToken = token || bearerToken;
  if (!idToken) throw new Error("AUTH_REQUIRED");
  const decoded = await adminAuth.verifyIdToken(idToken);
  if (!decoded?.uid) throw new Error("AUTH_REQUIRED");
  return decoded.uid;
}

export async function POST(req: NextRequest) {
  try {
    const uid = await requireAuthedUid(req);

    const body = (await req.json().catch(() => null)) as
      | { sessionId?: string }
      | null;
    const sessionId = body?.sessionId?.toString() ?? "";
    if (!sessionId) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
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

    // Defensive: ensure Stripe total matches expected pack price.
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

    const res = await adminDb.runTransaction(async (tx) => {
      const existingPaymentSnap = await tx.get(paymentRef);
      if (existingPaymentSnap.exists) {
        const existing = existingPaymentSnap.data() as { status?: string; amount?: number };
        if (existing?.status === "paid" || existing?.status === "succeeded") {
          const profileSnap = await tx.get(profileRef);
          const currentCredits = coerceCredits(profileSnap.exists ? profileSnap.data()?.credits : 0, 0);
          return { alreadyProcessed: true, creditsAdded: 0, creditsBalance: currentCredits };
        }
      }

      const profileSnap = await tx.get(profileRef);
      const currentCredits = coerceCredits(profileSnap.exists ? profileSnap.data()?.credits : 0, 0);
      const nextCredits = currentCredits + pack.credits;
      if (!Number.isFinite(nextCredits)) throw new Error("Invalid credits value");

      // Record payment (idempotent doc id).
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
              : checkoutSession.payment_intent ?? null,
        },
        { merge: true }
      );

      // Increment credits.
      tx.set(profileRef, { credits: nextCredits }, { merge: true });

      // Add auditable credit ledger entry (idempotent id).
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

      return { alreadyProcessed: false, creditsAdded: pack.credits, creditsBalance: nextCredits };
    });

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
  }
}

