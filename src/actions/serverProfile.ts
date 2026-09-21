"use server";

import { adminDb, admin } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";
import { coerceCredits } from "@/utils/credits";
import { creditsForNewProfile } from "@/utils/starterGrant";
import { sanitizeProfileUpdate } from "@/utils/profileContract";
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

export async function fetchProfileServer(authOverrides?: {
  authEmail?: string;
  authDisplayName?: string;
  authPhotoUrl?: string;
  authEmailVerified?: boolean;
}): Promise<ServerProfileData> {
  const uid = await requireAuthedUid();
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const claimRef = adminDb.doc(`users/${uid}/account/bootstrap`);
  const snap = await profileRef.get();

  const authEmail = authOverrides?.authEmail ?? "";
  const authDisplayName = authOverrides?.authDisplayName ?? "";
  const authPhotoUrl = authOverrides?.authPhotoUrl ?? "";
  const authEmailVerified = authOverrides?.authEmailVerified ?? false;
  const authFirstName = authDisplayName?.split(" ")[0] || "";
  const authLastName = authDisplayName?.split(" ").slice(1).join(" ") || "";

  if (snap.exists) {
    const data = snap.data() as Partial<ServerProfileData>;
    const existingClaim = await claimRef.get();
    if (!existingClaim.exists) {
      await claimRef.set({
        starterGrantClaimed: true,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
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

  const created = await adminDb.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const [profileSnap, claimSnap] = await Promise.all([
      tx.get(profileRef),
      tx.get(claimRef),
    ]);
    if (profileSnap.exists) {
      if (!claimSnap.exists) {
        tx.set(claimRef, {
          starterGrantClaimed: true,
          claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return profileSnap.data() as Partial<ServerProfileData>;
    }

    const newProfile: ServerProfileData = {
      ...PROFILE_DEFAULTS,
      email: authEmail,
      displayName: authDisplayName,
      photoUrl: authPhotoUrl,
      emailVerified: authEmailVerified,
      firstName: authFirstName,
      lastName: authLastName,
      credits: creditsForNewProfile(claimSnap.exists, PROFILE_DEFAULTS.credits),
    };
    tx.set(profileRef, newProfile);
    if (!claimSnap.exists) {
      tx.set(claimRef, {
        starterGrantClaimed: true,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return newProfile;
  });

  return {
    ...PROFILE_DEFAULTS,
    ...created,
    email: created.email || authEmail || "",
    contactEmail: created.contactEmail || authEmail || "",
    displayName: created.displayName || authDisplayName || "",
    photoUrl: created.photoUrl || authPhotoUrl || "",
    emailVerified: created.emailVerified ?? authEmailVerified,
    credits: coerceCredits(created.credits, 0),
    firstName: created.firstName || authFirstName || "",
    lastName: created.lastName || authLastName || "",
    headerUrl: created.headerUrl || "",
    text_model: resolveAiModelKey(created.text_model),
  };
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
  await admin.auth().deleteUser(uid);
  await profileRef.delete();
}
