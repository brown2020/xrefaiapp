import { cookies } from "next/headers";
import { adminAuth } from "@/firebase/firebaseAdmin";
import { getAuthCookieName } from "@/utils/getAuthCookieName";

/**
 * Strict server-side auth: verifies the ID token is present AND valid.
 * Use this for mutations, credit operations, and API routes.
 *
 * Intentionally NOT used on plain page renders: Firebase ID tokens expire
 * every hour, so verifying on every page navigation blocks signed-in users
 * after token expiry. Page-level protection is handled at the edge by
 * `proxy.ts` (checking cookie existence), and server actions / API routes
 * use this function to enforce real auth on mutations.
 */
export async function requireAuthedUid(): Promise<string> {
  const cookieName = getAuthCookieName();
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) throw new Error("AUTH_REQUIRED");

  const decoded = await adminAuth.verifyIdToken(token);
  if (!decoded?.uid) throw new Error("AUTH_REQUIRED");
  return decoded.uid;
}
