import { NextRequest } from "next/server";
import { adminAuth } from "@/firebase/firebaseAdmin";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { isTokenVerificationError } from "@/utils/authErrors";

function isAdminConfigError(error: unknown): boolean {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "app/invalid-credential" ||
    /project_id|service account|Unable to detect a Project Id|Could not load the default credentials/i.test(
      message,
    )
  );
}

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
    if (isTokenVerificationError(error) || isAdminConfigError(error)) {
      // Token invalid OR Admin SDK not configured (local/CI without secrets):
      // deny the mutation. Soft-gate cookies alone must not authorize spend/API.
      throw new Error("AUTH_REQUIRED", { cause: error });
    }
    // Transient infra/network failures: don't mask as a 401.
    throw error;
  }
  if (!decoded?.uid) throw new Error("AUTH_REQUIRED");
  return decoded.uid;
}
