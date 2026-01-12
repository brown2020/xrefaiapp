/**
 * Credit packs for Stripe checkout (web).
 *
 * Keep this as a shared, deterministic mapping so:
 * - the UI can render consistent pricing
 * - the server can map amountCents -> credits without trusting the client
 */
export type CreditPackId = "starter" | "plus" | "pro" | "power";

export type CreditPack = {
  id: CreditPackId;
  label: string;
  /** Amount in cents (Stripe PaymentIntent.amount) */
  amountCents: number;
  /** Credits to add after successful purchase */
  credits: number;
  /** Optional merchandising */
  badge?: "Best value" | "Popular";
};

export const CREDIT_PACKS: readonly CreditPack[] = [
  { id: "starter", label: "Starter", amountCents: 1000, credits: 1100 },
  { id: "plus", label: "Plus", amountCents: 2500, credits: 2900, badge: "Popular" },
  { id: "pro", label: "Pro", amountCents: 5000, credits: 6000 },
  { id: "power", label: "Power", amountCents: 9999, credits: 13000, badge: "Best value" },
] as const;

export const DEFAULT_CREDIT_PACK_ID: CreditPackId = "plus";

export function getCreditPack(id: string | null | undefined): CreditPack {
  const pack = CREDIT_PACKS.find((p) => p.id === id);
  return pack ?? CREDIT_PACKS.find((p) => p.id === DEFAULT_CREDIT_PACK_ID)!;
}

export function getCreditPackByAmountCents(amountCents: number): CreditPack | null {
  if (!Number.isFinite(amountCents)) return null;
  return CREDIT_PACKS.find((p) => p.amountCents === amountCents) ?? null;
}

export function formatDollarsFromCents(amountCents: number): string {
  const safe = Number.isFinite(amountCents) ? amountCents : 0;
  return (Math.max(0, Math.round(safe)) / 100).toFixed(2);
}

