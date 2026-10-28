import { cookies } from "next/headers";
import { isAdminConfigured } from "@/firebase/firebaseAdmin";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { sessionFromIdToken, type VerifiedIdToken } from "@/utils/verifiedIdToken";

/**
 * Strict server-side auth: verifies the ID token is present AND valid.
 * Use this for mutations, credit operations, and API routes.
 *
 * Intentionally NOT used on plain page renders: Firebase ID tokens expire
 * every hour, so verifying on every page navigation blocks signed-in users
 * after token expiry. Page-level protection is handled at the edge by
 * `proxy.ts` (checking cookie existence), and server actions / API routes
 * use this function to enforce real auth on mutations.
 *
 * `checkRevoked` is on, so a disabled, deleted, or revoked user fails here
 * instead of keeping access until the token's natural expiry.
 */
export async function requireAuthedSession(): Promise<VerifiedIdToken> {
  const cookieName = getAuthCookieName();
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) throw new Error("AUTH_REQUIRED");
  // Without Admin nothing can be verified, so a cookie alone never authorizes.
  if (!isAdminConfigured()) throw new Error("AUTH_REQUIRED");
  return sessionFromIdToken(token);
}

export async function requireAuthedUid(): Promise<string> {
  return (await requireAuthedSession()).uid;
}
