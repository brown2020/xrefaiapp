"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminBucket, adminDb } from "@/firebase/firebaseAdmin";
import { requireAuthedSession, requireAuthedUid } from "@/actions/serverAuth";
import { coerceCredits } from "@/utils/credits";
import { starterCreditsToAdd, type StarterClaimState } from "@/utils/starterGrant";
import { sanitizeProfileUpdate } from "@/utils/profileContract";
import { resolveAiModelKey } from "@/ai/models";
import type { AiModelKey } from "@/ai/models";
import { AI_CONSENT_VERSION } from "@/constants/aiConsent";

export interface ServerProfileData {
  email: string;
  contactEmail: string;
  displayName: string;
  photoUrl: string;
  emailVerified: boolean;
  credits: number;
  openai_api_key: string;
  anthropic_api_key: string;
  xai_api_key: string;
  google_api_key: string;
  selectedAvatar: string;
  selectedTalkingPhoto: string;
  useCredits: boolean;
  text_model: AiModelKey;
  firstName?: string;
  lastName?: string;
  headerUrl?: string;
  aiConsentVersion?: string;
  aiConsentAt?: string;
}

const PROFILE_DEFAULTS: ServerProfileData = {
  email: "",
  contactEmail: "",
  displayName: "",
  photoUrl: "",
  emailVerified: false,
  credits: 1000,
  openai_api_key: "",
  anthropic_api_key: "",
  xai_api_key: "",
  google_api_key: "",
  selectedAvatar: "",
  selectedTalkingPhoto: "",
  useCredits: true,
  text_model: "openai:gpt-5.4",
};

function claimStateOf(exists: boolean, granted: unknown): StarterClaimState {
  if (!exists) return "missing";
  return granted === true ? "granted" : "pending";
}

export async function fetchProfileServer(authOverrides?: {
  authEmail?: string;
  authDisplayName?: string;
  authPhotoUrl?: string;
  authEmailVerified?: boolean;
}): Promise<ServerProfileData> {
  const session = await requireAuthedSession();
  const uid = session.uid;
  // The ID token is the only source for verification. Client overrides cannot grant credits.
  const emailVerified = session.emailVerified;
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const claimRef = adminDb.doc(`users/${uid}/account/bootstrap`);
  const snap = await profileRef.get();

  const authEmail = session.email || authOverrides?.authEmail || "";
  const authDisplayName = authOverrides?.authDisplayName ?? "";
  const authPhotoUrl = authOverrides?.authPhotoUrl ?? "";
  const authFirstName = authDisplayName?.split(" ")[0] || "";
  const authLastName = authDisplayName?.split(" ").slice(1).join(" ") || "";

  // ID tokens stay valid for up to an hour after the Auth user is deleted, so
  // a deleted account's other sessions must not recreate its profile.
  if (!snap.exists) {
    await adminAuth.getUser(uid);
  }

  const created = await adminDb.runTransaction(async (tx) => {
    const [profileSnap, claimSnap] = await Promise.all([
      tx.get(profileRef),
      tx.get(claimRef),
    ]);
    const profileExists = profileSnap.exists;
    const data = (profileExists ? profileSnap.data() : {}) as Partial<ServerProfileData>;
    const claimState = claimStateOf(
      claimSnap.exists,
      claimSnap.exists ? claimSnap.data()?.starterGrantClaimed : undefined
    );
    const currentCredits = profileExists ? coerceCredits(data.credits, 0) : 0;
    const creditDelta = starterCreditsToAdd({
      profileExists,
      claimState,
      emailVerified,
      initialCredits: PROFILE_DEFAULTS.credits,
    });
    const nextCredits = currentCredits + creditDelta;
    const sealLegacyClaim = profileExists && claimState === "missing";
    const markGranted = creditDelta > 0;

    const nextProfile: ServerProfileData = {
      ...PROFILE_DEFAULTS,
      ...data,
      email: data.email || authEmail,
      displayName: data.displayName || authDisplayName,
      photoUrl: data.photoUrl || authPhotoUrl,
      emailVerified,
      firstName: data.firstName || authFirstName,
      lastName: data.lastName || authLastName,
      credits: nextCredits,
    };

    if (!profileExists) {
      tx.set(profileRef, nextProfile);
    } else if (creditDelta > 0 || data.emailVerified !== emailVerified) {
      tx.set(
        profileRef,
        { credits: nextCredits, emailVerified },
        { merge: true }
      );
    }

    if (sealLegacyClaim || markGranted) {
      tx.set(
        claimRef,
        {
          starterGrantClaimed: true,
          claimedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else if (!profileExists && !emailVerified && claimState === "missing") {
      // Hold the one-time claim open so a later verified sign-in can pay it.
      // A claim that is already granted stays granted.
      tx.set(
        claimRef,
        {
          starterGrantClaimed: false,
          claimedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return nextProfile;
  });

  return {
    ...PROFILE_DEFAULTS,
    ...created,
    email: created.email || authEmail || "",
    contactEmail: created.contactEmail || authEmail || "",
    displayName: created.displayName || authDisplayName || "",
    photoUrl: created.photoUrl || authPhotoUrl || "",
    emailVerified,
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

/**
 * Records the caller's permission to send their content to the AI providers
 * listed in the consent screen. `update` (not `set`) so a deleted account's
 * lingering session can't recreate its profile.
 */
export async function recordAiConsentServer(
  version: string
): Promise<{ aiConsentVersion: string; aiConsentAt: string }> {
  if (version !== AI_CONSENT_VERSION) throw new Error("STALE_AI_CONSENT_VERSION");
  const uid = await requireAuthedUid();
  const consent = { aiConsentVersion: version, aiConsentAt: new Date().toISOString() };
  await adminDb.doc(`users/${uid}/profile/userData`).update(consent);
  return consent;
}

/**
 * Permanently deletes the caller's account: every document under `users/{uid}`
 * (profile, chats, summaries, payments, ledger, idempotency, rate limits,
 * locks, bootstrap), their Storage files, and the uid on global IAP claims
 * (the claim itself stays so a receipt can never be redeemed again). The Auth
 * user is deleted last so a failed run can be retried while still signed in.
 */
export async function deleteAccountServer(): Promise<void> {
  const uid = await requireAuthedUid();

  await adminDb.recursiveDelete(adminDb.doc(`users/${uid}`));

  await Promise.all(
    [`users/${uid}/`, `generated/${uid}/`].map((prefix) =>
      adminBucket.deleteFiles({ prefix })
    )
  );

  const claims = await adminDb.collection("iapTransactions").where("uid", "==", uid).get();
  if (!claims.empty) {
    const batch = adminDb.batch();
    for (const claim of claims.docs) batch.update(claim.ref, { uid: FieldValue.delete() });
    await batch.commit();
  }

  try {
    await adminAuth.deleteUser(uid);
  } catch (error) {
    const isMissingUser =
      typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found";
    if (!isMissingUser) throw error;
  }
}
