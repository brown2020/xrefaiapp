"use server";

import { adminDb, admin } from "@/firebase/firebaseAdmin";

const PERSISTED_KEYS = [
  "authEmail",
  "authDisplayName",
  "authPhotoUrl",
  "authEmailVerified",
  "firebaseUid",
  "isAdmin",
  "isAllowed",
  "isInvited",
  "premium",
] as const;

type SyncableAuthFields = Partial<Record<(typeof PERSISTED_KEYS)[number], unknown>>;

/**
 * Syncs auth profile details to Firestore using the admin SDK.
 *
 * Accepts uid directly rather than reading it from the auth cookie because
 * this is called during the login flow before the cookie has been set.
 * The uid originates from the verified Firebase Auth state on the client.
 */
export async function syncAuthProfileServer(
  uid: string,
  details: SyncableAuthFields
): Promise<void> {
  if (!uid) return;

  const sanitized: Record<string, unknown> = {};
  for (const key of PERSISTED_KEYS) {
    const value = details[key];
    if (value !== undefined && value !== null && typeof value !== "function") {
      sanitized[key] = value;
    }
  }

  if (Object.keys(sanitized).length === 0) return;

  const userRef = adminDb.doc(`users/${uid}`);
  await userRef.set(
    { ...sanitized, lastSignIn: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}
