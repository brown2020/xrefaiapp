"use server";

import { adminDb, admin } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";

type SyncableAuthFields = Partial<
  Record<
    "authEmail" | "authDisplayName" | "authPhotoUrl" | "authEmailVerified",
    unknown
  >
>;

const MAX_AUTH_STRING_LENGTH = 4_000;

function clampAuthString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, MAX_AUTH_STRING_LENGTH);
}

export async function syncAuthProfileServer(
  details: SyncableAuthFields,
): Promise<void> {
  const uid = await requireAuthedUid();

  const sanitized: Record<string, unknown> = {};

  const authEmail = clampAuthString(details.authEmail);
  const authDisplayName = clampAuthString(details.authDisplayName);
  const authPhotoUrl = clampAuthString(details.authPhotoUrl);

  if (authEmail !== undefined) sanitized.authEmail = authEmail;
  if (authDisplayName !== undefined) sanitized.authDisplayName = authDisplayName;
  if (authPhotoUrl !== undefined) sanitized.authPhotoUrl = authPhotoUrl;
  if (typeof details.authEmailVerified === "boolean") {
    sanitized.authEmailVerified = details.authEmailVerified;
  }

  if (Object.keys(sanitized).length === 0) return;

  const userRef = adminDb.doc(`users/${uid}`);
  await userRef.set(
    { ...sanitized, lastSignIn: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}
