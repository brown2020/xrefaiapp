import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/firebase/firebaseAdmin";
import { getAuthCookieName } from "@/utils/getAuthCookieName";

/**
 * Extracts and verifies the Firebase ID token from a NextRequest.
 * Checks both the auth cookie and the Authorization header (Bearer token).
 * Use this in API route handlers; for server actions use requireAuthedUid from serverAuth.ts.
 */
export async function requireAuthedUidFromRequest(
  req: NextRequest
): Promise<string> {
  const cookieName = getAuthCookieName();
  const token = (await cookies()).get(cookieName)?.value;
  const bearer =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const bearerToken =
    bearer && bearer.toLowerCase().startsWith("bearer ")
      ? bearer.slice("bearer ".length).trim()
      : "";

  const idToken = token || bearerToken;
  if (!idToken) throw new Error("AUTH_REQUIRED");
  const decoded = await adminAuth.verifyIdToken(idToken);
  if (!decoded?.uid) throw new Error("AUTH_REQUIRED");
  return decoded.uid;
}
