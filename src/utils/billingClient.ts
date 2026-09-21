export type CheckoutStart =
  | { url: string }
  | { error: string };

export type PaymentConfirmResult =
  | {
      ok: true;
      alreadyProcessed: boolean;
      creditsAdded: number;
      creditsBalance: number;
      pack: { id: string; name: string; usdCents: number };
    }
  | { error: string; paymentStatus?: string };

async function readErrorMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;
  return body?.error || fallback;
}

export async function startCheckoutSession(
  payload: { packId: string; redirectPath: string },
  idToken: string
): Promise<CheckoutStart> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return {
      error: await readErrorMessage(response, "Failed to start checkout"),
    };
  }

  const body = (await response.json().catch(() => null)) as
    | { url?: string }
    | null;
  if (!body?.url) return { error: "Missing checkout URL" };
  return { url: body.url };
}

export async function confirmCheckoutSession(
  sessionId: string,
  idToken: string
): Promise<PaymentConfirmResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  const response = await fetch("/api/billing/confirm", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; paymentStatus?: string }
      | null;
    return {
      error: body?.error || "Payment confirmation failed",
      paymentStatus: body?.paymentStatus,
    };
  }

  const body = (await response.json().catch(() => null)) as
    | PaymentConfirmResult
    | null;
  if (!body) return { error: "Invalid response" };
  return body;
}
