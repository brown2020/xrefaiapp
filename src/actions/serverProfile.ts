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
  text_model: "openai:gpt-5.4",
};

const CLIENT_WRITABLE_FIELDS = {
  contactEmail: "string",
  displayName: "string",
  photoUrl: "string",
  fireworks_api_key: "string",
  openai_api_key: "string",
  anthropic_api_key: "string",
  xai_api_key: "string",
  google_api_key: "string",
  stability_api_key: "string",
  selectedAvatar: "string",
  selectedTalkingPhoto: "string",
  useCredits: "boolean",
  text_model: "model",
  firstName: "string",
  lastName: "string",
  headerUrl: "string",
} as const;

type ClientWritableProfileField = keyof typeof CLIENT_WRITABLE_FIELDS;

/**
 * Maximum length of a string field written from the client. Protects
 * Firestore from oversized documents and prevents abuse.
 */
const MAX_STRING_FIELD_LENGTH = 4_000;

function sanitizeProfileUpdate(
  fields: Partial<ServerProfileData>
): Partial<ServerProfileData> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields) as [
    ClientWritableProfileField,
    unknown,
  ][]) {
    if (!(key in CLIENT_WRITABLE_FIELDS) || value === undefined) continue;
    if (typeof value === "function") continue;

    const expectedType = CLIENT_WRITABLE_FIELDS[key];
    if (expectedType === "boolean") {
      if (typeof value === "boolean") sanitized[key] = value;
      continue;
    }

    if (expectedType === "model") {
      if (typeof value === "string") sanitized[key] = resolveAiModelKey(value);
      continue;
    }

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, MAX_STRING_FIELD_LENGTH);
    }
  }

  return sanitized as Partial<ServerProfileData>;
}

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
  const authLastName = authDisplayName?.split(" ").slice(1).join(" ") || "";

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
      credits: coerceCredits(data.credits, PROFILE_DEFAULTS.credits),
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
  const sanitized = sanitizeProfileUpdate(fields);

  if (Object.keys(sanitized).length === 0) return;

  await profileRef.set(sanitized, { merge: true });
}

export async function deleteAccountServer(): Promise<void> {
  const uid = await requireAuthedUid();
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  await profileRef.delete();
  await admin.auth().deleteUser(uid);
}
