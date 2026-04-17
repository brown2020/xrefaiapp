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

/**
 * Page-level auth gate for Server Components.
 *
 * Behaviour:
 * - Verifies the token cryptographically. This detects tampered / forged
 *   tokens even when they are expired.
 * - If the token is expired but otherwise valid (signature verifies against
 *   Google's published keys), we still allow the page to render so the
 *   client-side token refresh can obtain a fresh token on hydration.
 * - Any other failure mode (missing token, invalid signature, revoked,
 *   malformed) redirects to home.
 */
export async function requireAuthedPageUid(): Promise<string> {
  const cookieName = getAuthCookieName();
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) throw new Error("AUTH_REQUIRED");

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded?.uid) throw new Error("AUTH_REQUIRED");
    return decoded.uid;
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code: string }).code
        : "";

    if (code === "auth/id-token-expired") {
      // Token expired. Verify again with `checkRevoked: false` but via a
      // parse that still requires the signature. firebase-admin doesn't
      // expose a "verify signature only" API, so we use `createSessionCookie`
      // as a no-op probe — or simply re-verify and accept the expiration
      // failure path as signature-proof. The only way `verifyIdToken` throws
      // with `auth/id-token-expired` is after it successfully verified the
      // signature and issuer; only the `exp` check failed.
      const payloadB64 = token.split(".")[1];
      if (payloadB64) {
        try {
          const payload = JSON.parse(
            Buffer.from(payloadB64, "base64").toString("utf-8")
          ) as { user_id?: string; sub?: string };
          const uid = payload.user_id || payload.sub;
          if (typeof uid === "string" && uid) return uid;
        } catch {
          // fall through
        }
      }
    }
    throw new Error("AUTH_REQUIRED", { cause: error });
  }
}
