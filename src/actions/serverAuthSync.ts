"use server";

import { adminDb, admin } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";

const PERSISTED_KEYS = [
  "authEmail",
  "authDisplayName",
  "authPhotoUrl",
  "authEmailVerified",
] as const;

type SyncableAuthFields = Partial<Record<(typeof PERSISTED_KEYS)[number], unknown>>;
export async function syncAuthProfileServer(
  details: SyncableAuthFields,
): Promise<void> {
  const uid = await requireAuthedUid();

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
