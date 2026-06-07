import { NextRequest } from "next/server";
import { adminAuth } from "@/firebase/firebaseAdmin";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { isTokenVerificationError } from "@/utils/authErrors";

/**
 * Extracts and verifies the Firebase ID token from a NextRequest.
 * Checks both the auth cookie and the Authorization header (Bearer token).
 * Use this in API route handlers; for server actions use requireAuthedUid from serverAuth.ts.
 */
export async function requireAuthedUidFromRequest(
  req: NextRequest
): Promise<string> {
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

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    if (isTokenVerificationError(error)) {
      throw new Error("AUTH_REQUIRED", { cause: error });
    }
    // Infra/config failure (network, Firebase outage): don't mask as a 401.
    throw error;
  }
  if (!decoded?.uid) throw new Error("AUTH_REQUIRED");
  return decoded.uid;
}
