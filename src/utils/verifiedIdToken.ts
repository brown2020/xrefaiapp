import { adminAuth, isAdminConfigured } from "@/firebase/firebaseAdmin";
import { isTokenVerificationError } from "@/utils/authErrors";
import { isAllowedSignInProvider } from "@/utils/signInProviders";

export type VerifiedIdToken = {
  uid: string;
  email: string;
  emailVerified: boolean;
  signInProvider: string;
};

/**
 * Verifies a Firebase ID token, checks revocation, and rejects sign-in
 * providers this app does not offer (for example anonymous).
 */
export async function sessionFromIdToken(idToken: string): Promise<VerifiedIdToken> {
  if (!isAdminConfigured()) throw new Error("AUTH_REQUIRED");

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (error) {
    if (isTokenVerificationError(error)) {
      throw new Error("AUTH_REQUIRED", { cause: error });
    }
    throw error;
  }

  if (!decoded?.uid) throw new Error("AUTH_REQUIRED");
  const signInProvider = decoded.firebase?.sign_in_provider ?? "";
  if (!isAllowedSignInProvider(signInProvider)) {
    throw new Error("AUTH_REQUIRED");
  }

  return {
    uid: decoded.uid,
    email: typeof decoded.email === "string" ? decoded.email : "",
    emailVerified: decoded.email_verified === true,
    signInProvider,
  };
}
