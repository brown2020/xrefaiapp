type StoreTransaction = {
  product_id?: unknown;
  transaction_id?: unknown;
};

type StoreReceipt = {
  in_app?: unknown;
  bundle_id?: unknown;
  app_item_id?: unknown;
};

type StoreReceiptResponse = {
  status?: unknown;
  receipt?: StoreReceipt;
  latest_receipt_info?: unknown;
};

const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

export type ReceiptMatchExpectation = {
  productId: string;
  transactionId: string;
  bundleId: string;
  /** Required when the receipt includes `app_item_id` (production receipts). */
  appItemId?: string;
};

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
  // Only the store transaction id. Matching original_transaction_id as well
  // lets one purchase be claimed twice when the two ids differ.
  return transaction.transaction_id === transactionId;
}

function bundleIdOf(body: StoreReceiptResponse): string | null {
  const bundleId = body.receipt?.bundle_id;
  if (typeof bundleId !== "string") return null;
  const trimmed = bundleId.trim();
  return trimmed || null;
}

function appItemIdOf(body: StoreReceiptResponse): string | null {
  const appItemId = body.receipt?.app_item_id;
  if (typeof appItemId === "number" && Number.isFinite(appItemId)) return String(appItemId);
  if (typeof appItemId !== "string") return null;
  const trimmed = appItemId.trim();
  return trimmed || null;
}

/**
 * A store verifier response grants the pack only when status is 0, the receipt
 * belongs to this app, and one transaction names both the catalog product and
 * the signed transaction id.
 */
export function storeReceiptMatches(
  payload: unknown,
  expected: ReceiptMatchExpectation
): boolean {
  if (typeof payload !== "object" || payload === null) return false;
  if (!expected.bundleId) return false;
  const body = payload as StoreReceiptResponse;
  if (body.status !== 0) return false;
  if (bundleIdOf(body) !== expected.bundleId) return false;

  const appItemId = appItemIdOf(body);
  if (appItemId && appItemId !== expected.appItemId) return false;

  const transactions = [
    ...asTransactions(body.receipt?.in_app),
    ...asTransactions(body.latest_receipt_info),
  ];
  return transactions.some((transaction) =>
    transactionMatches(transaction, expected.productId, expected.transactionId)
  );
}

/**
 * Local fixture URL. Ignored in production unless an emulator host is set,
 * so a deployed env cannot point receipt checks at an attacker verifier.
 */
export function iapReceiptOverrideUrlFrom(env: {
  nodeEnv?: string;
  override?: string;
  authEmulatorHost?: string;
  firestoreEmulatorHost?: string;
}): string | null {
  const override = (env.override || "").trim();
  if (!override) return null;
  const emulator = Boolean(env.authEmulatorHost || env.firestoreEmulatorHost);
  if (env.nodeEnv === "production" && !emulator) return null;
  return override;
}

export function iapReceiptOverrideUrl(): string | null {
  return iapReceiptOverrideUrlFrom({
    nodeEnv: process.env.NODE_ENV,
    override: process.env.IAP_RECEIPT_VERIFY_URL,
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
  });
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
 * `APPLE_BUNDLE_ID` is required. Production receipts that include
 * `app_item_id` also require `APPLE_APP_ITEM_ID`.
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

  const bundleId = (process.env.APPLE_BUNDLE_ID || "").trim();
  if (!bundleId) throw new Error("IAP_NOT_CONFIGURED");
  const appItemId = (process.env.APPLE_APP_ITEM_ID || "").trim() || undefined;
  const expected: ReceiptMatchExpectation = {
    productId: input.productId,
    transactionId: input.transactionId,
    bundleId,
    appItemId,
  };

  const override = iapReceiptOverrideUrl();
  if (platform === "android" && !override) {
    throw new Error("IAP_NOT_CONFIGURED");
  }

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
