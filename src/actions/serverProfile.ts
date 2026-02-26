"use server";

import { adminDb, admin } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";
import { coerceCredits } from "@/utils/credits";
import { resolveAiModelKey } from "@/ai/models";
import type { AiModelKey } from "@/ai/models";

export interface ServerProfileData {
  email: string;
  contactEmail: string;
  displayName: string;
  photoUrl: string;
  emailVerified: boolean;
  credits: number;
  fireworks_api_key: string;
  openai_api_key: string;
  anthropic_api_key: string;
  xai_api_key: string;
  google_api_key: string;
  stability_api_key: string;
  selectedAvatar: string;
  selectedTalkingPhoto: string;
  useCredits: boolean;
  text_model: AiModelKey;
  firstName?: string;
  lastName?: string;
  headerUrl?: string;
}

const PROFILE_DEFAULTS: ServerProfileData = {
  email: "",
  contactEmail: "",
  displayName: "",
  photoUrl: "",
  emailVerified: false,
  credits: 1000,
  fireworks_api_key: "",
  openai_api_key: "",
  anthropic_api_key: "",
  xai_api_key: "",
  google_api_key: "",
  stability_api_key: "",
  selectedAvatar: "",
  selectedTalkingPhoto: "",
  useCredits: true,
  text_model: "openai:gpt-5.2",
};

export async function fetchProfileServer(authOverrides?: {
  authEmail?: string;
  authDisplayName?: string;
  authPhotoUrl?: string;
  authEmailVerified?: boolean;
}): Promise<ServerProfileData> {
  const uid = await requireAuthedUid();
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const snap = await profileRef.get();

  const authEmail = authOverrides?.authEmail ?? "";
  const authDisplayName = authOverrides?.authDisplayName ?? "";
  const authPhotoUrl = authOverrides?.authPhotoUrl ?? "";
  const authEmailVerified = authOverrides?.authEmailVerified ?? false;
  const authFirstName = authDisplayName?.split(" ")[0] || "";
  const authLastName = authDisplayName?.split(" ")[1] || "";

  if (snap.exists) {
    const data = snap.data() as Partial<ServerProfileData>;
    return {
      ...PROFILE_DEFAULTS,
      ...data,
      email: data.email || authEmail || "",
      contactEmail: data.contactEmail || authEmail || "",
      displayName: data.displayName || authDisplayName || "",
      photoUrl: data.photoUrl || authPhotoUrl || "",
      emailVerified: data.emailVerified ?? authEmailVerified,
      credits: coerceCredits(data.credits, 1000),
      firstName: data.firstName || authFirstName || "",
      lastName: data.lastName || authLastName || "",
      headerUrl: data.headerUrl || "",
      text_model: resolveAiModelKey(data.text_model),
    };
  }

  const newProfile: ServerProfileData = {
    ...PROFILE_DEFAULTS,
    email: authEmail,
    displayName: authDisplayName,
    photoUrl: authPhotoUrl,
    emailVerified: authEmailVerified,
    firstName: authFirstName,
    lastName: authLastName,
  };

  await profileRef.set(newProfile);
  return newProfile;
}

export async function updateProfileServer(
  fields: Partial<ServerProfileData>
): Promise<void> {
  const uid = await requireAuthedUid();
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== "function") {
      sanitized[key] = value;
    }
  }

  await profileRef.set(sanitized, { merge: true });
}

export async function deleteAccountServer(): Promise<void> {
  const uid = await requireAuthedUid();
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  await profileRef.delete();
  await admin.auth().deleteUser(uid);
}

export async function changeCreditsAtomicServer(
  delta: number
): Promise<number> {
  const uid = await requireAuthedUid();
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);

  return await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    const current = coerceCredits(
      snap.exists ? snap.data()?.credits : 1000,
      1000
    );

    const next = current + delta;
    if (!Number.isFinite(next)) throw new Error("Invalid credits value");
    if (next < 0) throw new Error("INSUFFICIENT_CREDITS");

    if (!snap.exists) {
      tx.set(profileRef, { credits: next }, { merge: true });
    } else {
      tx.update(profileRef, { credits: next });
    }

    return next;
  });
}
