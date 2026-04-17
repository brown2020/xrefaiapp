import { adminDb, admin } from "@/firebase/firebaseAdmin";
import crypto from "crypto";

/**
 * Default TTL for idempotency keys (24 hours in milliseconds)
 */
const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generates a deterministic idempotency key from user ID and request payload.
 *
 * Prefer `generateClientIdempotencyKey` with an explicit client-provided key.
 * This fallback is best-effort only: because it hashes the raw payload, rapid
 * retries with the same payload are coalesced, but intentionally-distinct
 * re-sends of the same content within the window will also be blocked.
 * A time-window is intentionally NOT used — previously it caused retries that
 * crossed the window boundary to bypass idempotency and double-charge.
 */
export function generateIdempotencyKey(uid: string, payload: unknown): string {
  const data = JSON.stringify({ uid, payload });
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generates an idempotency key from a client-provided unique key.
 * Use this when the client provides a unique request ID (preferred).
 *
 * @param uid - The user's unique identifier
 * @param clientKey - A unique key provided by the client
 * @returns A deterministic idempotency key string
 */
export function generateClientIdempotencyKey(uid: string, clientKey: string): string {
  const data = `${uid}:${clientKey}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Result of checking idempotency status
 */
export interface IdempotencyResult {
  /** Whether this is a new request (not previously processed) */
  isNew: boolean;
  /** The idempotency key used */
  key: string;
  /** Current lifecycle status for the original request */
  status: "processing" | "completed";
  /** If not new, the timestamp when the original request was processed */
  processedAt?: Date;
}

/**
 * Checks if a request with this idempotency key has already been processed.
 * If new, atomically marks the key as being processed.
 *
 * Uses Firestore transactions to prevent race conditions where
 * two identical requests arrive simultaneously.
 *
 * @param uid - The user's unique identifier
 * @param idempotencyKey - The idempotency key to check
 * @param ttlMs - Time-to-live for the idempotency record (default: 24 hours)
 * @returns IdempotencyResult indicating if this is a new request
 */
export async function checkAndSetIdempotency(
  uid: string,
  idempotencyKey: string,
  ttlMs: number = DEFAULT_IDEMPOTENCY_TTL_MS
): Promise<IdempotencyResult> {
  const idempotencyRef = adminDb.doc(`users/${uid}/idempotency/${idempotencyKey}`);

  return await adminDb.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const snap = await tx.get(idempotencyRef);

    if (snap.exists) {
      const data = snap.data() as
        | {
            processedAt?: FirebaseFirestore.Timestamp | Date | null;
            expiresAt?: FirebaseFirestore.Timestamp | Date | null;
            status?: "processing" | "completed";
          }
        | undefined;
      const processedAt =
        data?.processedAt instanceof admin.firestore.Timestamp
          ? data.processedAt.toDate()
          : data?.processedAt instanceof Date
            ? data.processedAt
            : undefined;
      const expiresAt =
        data?.expiresAt instanceof admin.firestore.Timestamp
          ? data.expiresAt.toDate()
          : data?.expiresAt instanceof Date
            ? data.expiresAt
            : null;

      // If expired, treat as new and overwrite so retries remain possible.
      if (expiresAt && expiresAt.getTime() < Date.now()) {
        const now = new Date();
        tx.set(idempotencyRef, {
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(now.getTime() + ttlMs),
          status: "processing",
        });
        return { isNew: true, key: idempotencyKey, status: "processing" as const };
      }

      return {
        isNew: false,
        key: idempotencyKey,
        status: data?.status === "completed" ? ("completed" as const) : ("processing" as const),
        processedAt,
      };
    }

    const now = new Date();
    tx.set(idempotencyRef, {
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(now.getTime() + ttlMs),
      status: "processing",
    });

    return { isNew: true, key: idempotencyKey, status: "processing" as const };
  });
}

/**
 * Marks an idempotency record as completed successfully.
 * Uses `set(..., { merge: true })` so it succeeds even if the record was
 * removed (e.g. by `markIdempotencyFailed`) before success fired.
 */
export async function markIdempotencyComplete(
  uid: string,
  idempotencyKey: string
): Promise<void> {
  const idempotencyRef = adminDb.doc(`users/${uid}/idempotency/${idempotencyKey}`);
  await idempotencyRef.set(
    {
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Marks an idempotency record as failed, allowing retry.
 * Call this if the operation fails and should be retryable.
 */
export async function markIdempotencyFailed(
  uid: string,
  idempotencyKey: string
): Promise<void> {
  const idempotencyRef = adminDb.doc(`users/${uid}/idempotency/${idempotencyKey}`);
  try {
    await idempotencyRef.delete();
  } catch {
    // Ignore delete failures (e.g. already deleted).
  }
}

/**
 * Cleanup function to remove expired idempotency records.
 * Safe to call periodically as a cron/cloud job.
 */
export async function cleanupExpiredIdempotencyRecords(
  uid: string,
  batchSize: number = 100
): Promise<number> {
  const now = new Date();
  const expiredQuery = adminDb
    .collection(`users/${uid}/idempotency`)
    .where("expiresAt", "<", now)
    .limit(batchSize);

  const snapshot = await expiredQuery.get();
  if (snapshot.empty) return 0;

  const batch = adminDb.batch();
  snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return snapshot.size;
}
