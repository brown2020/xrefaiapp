type StoreTransaction = {
  product_id?: unknown;
  transaction_id?: unknown;
  original_transaction_id?: unknown;
};

type StoreReceiptResponse = {
  status?: unknown;
  receipt?: { in_app?: unknown };
  latest_receipt_info?: unknown;
};

const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

function asTransactions(value: unknown): StoreTransaction[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is StoreTransaction => typeof item === "object" && item !== null);
}

function transactionMatches(
  transaction: StoreTransaction,
  productId: string,
  transactionId: string
): boolean {
  if (transaction.product_id !== productId) return false;
  return (
    transaction.transaction_id === transactionId ||
    transaction.original_transaction_id === transactionId
  );
}

/**
 * A store verifier response grants the pack only when status is 0 and one
 * transaction names both the catalog product and the signed transaction id.
 */
export function storeReceiptMatches(
  payload: unknown,
  expected: { productId: string; transactionId: string }
): boolean {
  if (typeof payload !== "object" || payload === null) return false;
  const body = payload as StoreReceiptResponse;
  if (body.status !== 0) return false;
  const transactions = [
    ...asTransactions(body.receipt?.in_app),
    ...asTransactions(body.latest_receipt_info),
  ];
  return transactions.some((transaction) =>
    transactionMatches(transaction, expected.productId, expected.transactionId)
  );
}

async function postReceipt(
  url: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("IAP_RECEIPT_REJECTED");
  }
  return response.json();
}

/**
 * Confirms the store charged this transaction before any credit grant.
 * HMAC is not enough: a leaked native secret cannot mint a catalog pack.
 * `IAP_RECEIPT_VERIFY_URL` overrides the store endpoint for a local fixture.
 * Android grants stay closed unless that verifier is configured.
 */
export async function verifyIapReceipt(input: {
  platform: string;
  receipt: string;
  productId: string;
  transactionId: string;
}): Promise<void> {
  const receipt = input.receipt.trim();
  if (!receipt) throw new Error("IAP_RECEIPT_REQUIRED");

  const platform = input.platform.trim().toLowerCase();
  if (platform !== "ios" && platform !== "android") {
    throw new Error("IAP_PLATFORM_UNSUPPORTED");
  }

  const override = (process.env.IAP_RECEIPT_VERIFY_URL || "").trim();
  if (platform === "android" && !override) {
    throw new Error("IAP_NOT_CONFIGURED");
  }

  const expected = { productId: input.productId, transactionId: input.transactionId };
  if (override) {
    const payload = await postReceipt(override, {
      platform,
      receipt,
      productId: input.productId,
      transactionId: input.transactionId,
    });
    if (!storeReceiptMatches(payload, expected)) {
      throw new Error("IAP_RECEIPT_REJECTED");
    }
    return;
  }

  const password = (process.env.APPLE_IAP_SHARED_SECRET || "").trim();
  const appleBody: Record<string, unknown> = {
    "receipt-data": receipt,
    "exclude-old-transactions": true,
  };
  if (password) appleBody.password = password;

  let payload = await postReceipt(APPLE_PRODUCTION_URL, appleBody);
  if (
    typeof payload === "object" &&
    payload !== null &&
    (payload as StoreReceiptResponse).status === 21007
  ) {
    payload = await postReceipt(APPLE_SANDBOX_URL, appleBody);
  }
  if (!storeReceiptMatches(payload, expected)) {
    throw new Error("IAP_RECEIPT_REJECTED");
  }
}
