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
 * Lenient page-level auth check: allows the page to render if a token cookie
 * exists, even when expired. The client-side token refresh will obtain a fresh
 * token once the page hydrates.
 *
 * Falls back to strict verification first; on `auth/id-token-expired` it
 * extracts the uid from the token payload without full verification so the
 * page can render while the client refreshes the token.
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
      // Token exists but is expired — decode the payload without verification
      // so the page can render. The client will refresh the token on hydration.
      try {
        const payloadB64 = token.split(".")[1];
        if (!payloadB64) throw new Error("AUTH_REQUIRED");
        const payload = JSON.parse(
          Buffer.from(payloadB64, "base64").toString("utf-8")
        );
        if (typeof payload.user_id === "string" && payload.user_id) {
          return payload.user_id;
        }
      } catch {
        // Malformed token — treat as unauthenticated
      }
    }
    throw new Error("AUTH_REQUIRED");
  }
}

