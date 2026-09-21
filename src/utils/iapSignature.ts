import crypto from "crypto";

export type IapSignedFields = {
  transactionId: string;
  productId: string;
  amount: number;
  currency: string;
  platform: string;
  credits: number;
  ts: number;
  receipt: string;
};

/**
 * Canonical HMAC input for a native IAP confirmation.
 * The store receipt is part of the signed payload so a valid signature
 * cannot be replayed with a different receipt.
 */
export function canonicalIapPayload(input: IapSignedFields): string {
  return JSON.stringify({
    transactionId: String(input.transactionId),
    productId: String(input.productId),
    amount: Number(input.amount),
    currency: String(input.currency).toUpperCase(),
    platform: String(input.platform),
    credits: Number(input.credits),
    ts: Number(input.ts),
    receipt: String(input.receipt),
  });
}

export function signIapPayload(secret: string, input: IapSignedFields): string {
  return crypto.createHmac("sha256", secret).update(canonicalIapPayload(input)).digest("hex");
}
