import { NextRequest } from "next/server";
import type Stripe from "stripe";
import {
  clawbackStripeCharge,
  fulfillPaidCheckoutSession,
  paymentIntentIdFrom,
} from "@/actions/stripeFulfillment";
import { getStripe } from "@/utils/stripeServer";

export const runtime = "nodejs";

/**
 * Signed Stripe webhook. Grants credits when Checkout completes even if the
 * browser never returns, and removes credits on refunds and disputes.
 * When `STRIPE_WEBHOOK_SECRET` is unset, nothing is granted.
 */
export async function POST(req: NextRequest) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    console.error("Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not set");
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature failed:", error);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      if (session.payment_status === "paid") {
        const result = await fulfillPaidCheckoutSession(session);
        if (!result.ok) {
          console.error("Stripe webhook did not grant credits:", result.error);
        }
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = paymentIntentIdFrom(charge.payment_intent);
      if (paymentIntentId) {
        await clawbackStripeCharge({
          paymentIntentId,
          eventId: event.id,
          reason: "refund",
          amountRefunded: charge.amount_refunded,
          amountTotal: charge.amount,
        });
      }
    } else if (event.type === "charge.dispute.created") {
      const dispute = event.data.object;
      const paymentIntentId = paymentIntentIdFrom(dispute.payment_intent);
      if (paymentIntentId) {
        await clawbackStripeCharge({
          paymentIntentId,
          eventId: event.id,
          reason: "dispute",
          amountRefunded: null,
          amountTotal: null,
        });
      }
    }
  } catch (error) {
    console.error("Stripe webhook handler failed:", error);
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
