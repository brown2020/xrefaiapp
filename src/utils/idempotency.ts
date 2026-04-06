import { adminDb, admin } from "@/firebase/firebaseAdmin";
import crypto from "crypto";

/**
 * Default TTL for idempotency keys (24 hours in milliseconds)
 */
const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generates a deterministic idempotency key from user ID and request payload.
 * The key is a SHA-256 hash that uniquely identifies this request.
 *
 * @param uid - The user's unique identifier
 * @param payload - The request payload to hash (will be JSON stringified)
 * @param timeWindow - Optional time window in ms to include in hash (defaults to 1 minute)
 * @returns A deterministic idempotency key string
 */
export function generateIdempotencyKey(
  uid: string,
  payload: unknown,
  timeWindow: number = 60_000
): string {
  // Round timestamp to time window for some tolerance on rapid identical requests
  const timeSlot = Math.floor(Date.now() / timeWindow);
  const data = JSON.stringify({ uid, payload, timeSlot });
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generates an idempotency key without time window for client-provided keys.
 * Use this when the client provides a unique request ID.
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
 * This uses Firestore transactions to prevent race conditions where
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

  return await adminDb.runTransaction(async (tx: any) => {
    const snap = await tx.get(idempotencyRef);

    if (snap.exists) {
      const data = snap.data();
      const processedAt = data?.processedAt?.toDate?.() || new Date(data?.processedAt);
      const expiresAt = data?.expiresAt?.toDate?.() || new Date(data?.expiresAt);

      // Check if the record has expired
      if (expiresAt && expiresAt < new Date()) {
        // Record expired, treat as new and overwrite
        const now = new Date();
        tx.set(idempotencyRef, {
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(now.getTime() + ttlMs),
          status: "processing",
        });
        return { isNew: true, key: idempotencyKey, status: "processing" };
      }

      // Record exists and hasn't expired - this is a duplicate
      return {
        isNew: false,
        key: idempotencyKey,
        status: data?.status === "completed" ? "completed" : "processing",
        processedAt,
      };
    }

    // New request - create the idempotency record
    const now = new Date();
    tx.set(idempotencyRef, {
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(now.getTime() + ttlMs),
      status: "processing",
    });

    return { isNew: true, key: idempotencyKey, status: "processing" };
  });
}

/**
 * Marks an idempotency record as completed successfully.
 * Call this after the operation succeeds to update the status.
 *
 * @param uid - The user's unique identifier
 * @param idempotencyKey - The idempotency key to mark as complete
 */
export async function markIdempotencyComplete(
  uid: string,
  idempotencyKey: string
): Promise<void> {
  const idempotencyRef = adminDb.doc(`users/${uid}/idempotency/${idempotencyKey}`);
  await idempotencyRef.update({
    status: "completed",
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Marks an idempotency record as failed, allowing retry.
 * Call this if the operation fails and should be retryable.
 *
 * @param uid - The user's unique identifier
 * @param idempotencyKey - The idempotency key to mark as failed
 */
export async function markIdempotencyFailed(
  uid: string,
  idempotencyKey: string
): Promise<void> {
  const idempotencyRef = adminDb.doc(`users/${uid}/idempotency/${idempotencyKey}`);
  // Delete the record so the request can be retried
  await idempotencyRef.delete();
}

/**
 * Cleanup function to remove expired idempotency records.
 * This can be run periodically as a cron job or cloud function.
 *
 * @param uid - The user's unique identifier
 * @param batchSize - Maximum number of records to delete in one call
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

  if (snapshot.empty) {
    return 0;
  }

  const batch = adminDb.batch();
  snapshot.docs.forEach((doc: any) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return snapshot.size;
}
