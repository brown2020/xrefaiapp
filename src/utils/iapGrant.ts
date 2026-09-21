import { CREDIT_PACKS } from "@/constants/creditPacks";

export type IapGrant =
  | { ok: true; packId: string; credits: number }
  | { ok: false; error: "UNKNOWN_IAP_PRODUCT" | "IAP_CREDITS_MISMATCH" };

/**
 * Credits granted for an IAP come from the server catalog.
 * The signed payload must name a known pack and repeat that pack's credit count.
 */
export function resolveIapCreditGrant(productId: string, credits: number): IapGrant {
  const pack = CREDIT_PACKS.find((candidate) => candidate.id === productId);
  if (!pack) return { ok: false, error: "UNKNOWN_IAP_PRODUCT" };
  if (!Number.isFinite(credits) || Math.floor(credits) !== pack.credits) {
    return { ok: false, error: "IAP_CREDITS_MISMATCH" };
  }
  return { ok: true, packId: pack.id, credits: pack.credits };
}
