import { NextRequest } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { adminAuth } from "@/firebase/firebaseAdmin";
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
      | { packId?: string; redirectPath?: string }
      | null;
    const packId = body?.packId?.toString() ?? "";
    const redirectPath = body?.redirectPath?.toString() ?? "/account";

    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return Response.json({ error: "Invalid packId" }, { status: 400 });
    }

    const productName = (process.env.NEXT_PUBLIC_STRIPE_PRODUCT_NAME || "Xref.ai Credits").trim();

    // Prefer a configured canonical origin; fall back to request origin for local dev.
    const appUrl = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");

    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.amountCents,
            product_data: {
              name: `${productName} (${pack.label})`,
              description: `${pack.credits.toLocaleString()} credits`,
            },
          },
        },
      ],
      success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(
        redirectPath
      )}`,
      cancel_url: `${appUrl}/account?canceled=1`,
      client_reference_id: uid,
      metadata: {
        uid,
        packId: pack.id,
        credits: String(pack.credits),
        usdCents: String(pack.amountCents),
        redirectPath,
      },
    });

    return Response.json({ url: checkoutSession.url }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating Stripe checkout session:", error);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

