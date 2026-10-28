import { NextRequest } from "next/server";
import { isAdminConfigured } from "@/firebase/firebaseAdmin";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { sessionFromIdToken, type VerifiedIdToken } from "@/utils/verifiedIdToken";

/**
 * Extracts and verifies the Firebase ID token from a NextRequest.
 * Checks both the auth cookie and the Authorization header (Bearer token).
 * Use this in API route handlers; for server actions use requireAuthedUid from serverAuth.ts.
 * Revocation is checked. Unexpected sign-in providers are rejected.
 */
export async function requireAuthedSessionFromRequest(
  req: NextRequest
): Promise<VerifiedIdToken> {
  const cookieName = getAuthCookieName();
  const cookieToken = req.cookies.get(cookieName)?.value;
  const bearer =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const bearerToken =
    bearer && bearer.toLowerCase().startsWith("bearer ")
      ? bearer.slice("bearer ".length).trim()
      : "";

  const idToken = bearerToken || cookieToken;
  if (!idToken) throw new Error("AUTH_REQUIRED");
  // Without Admin nothing can be verified, so a cookie alone never authorizes.
  if (!isAdminConfigured()) throw new Error("AUTH_REQUIRED");
  return sessionFromIdToken(idToken);
}

export async function requireAuthedUidFromRequest(
  req: NextRequest
): Promise<string> {
  return (await requireAuthedSessionFromRequest(req)).uid;
}
