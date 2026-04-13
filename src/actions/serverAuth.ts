import { cookies } from "next/headers";
import { adminAuth } from "@/firebase/firebaseAdmin";
import { getAuthCookieName } from "@/utils/getAuthCookieName";

/**
 * Strict server-side auth: verifies the ID token is present AND valid.
 * Use this for mutations, credit operations, and API routes.
 */
export async function requireAuthedUid(): Promise<string> {
  const cookieName = getAuthCookieName();
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) throw new Error("AUTH_REQUIRED");

  const decoded = await adminAuth.verifyIdToken(token);
  if (!decoded?.uid) throw new Error("AUTH_REQUIRED");
  return decoded.uid;
}
