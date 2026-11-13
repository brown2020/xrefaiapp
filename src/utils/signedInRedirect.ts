import { redirect } from "next/navigation";
import { requireAuthedSession } from "@/actions/serverAuth";
import { DEFAULT_SIGNED_IN_ROUTE } from "@/constants/routes";
import { sanitizeInternalRedirectPath } from "@/utils/redirectPath";

async function hasVerifiedSession(): Promise<boolean> {
  try {
    await requireAuthedSession();
    return true;
  } catch (error) {
    if (!(error instanceof Error && error.message === "AUTH_REQUIRED")) {
      console.error("Signed-in check failed:", error);
    }
    return false;
  }
}

/**
 * Sends a visitor whose auth cookie verifies (signature, expiry, revocation,
 * provider) to the allowlisted `next`. Missing, stale, forged, or unverifiable
 * cookies return normally so the sign-in form renders.
 */
export async function redirectIfSignedIn(next: unknown): Promise<void> {
  if (!(await hasVerifiedSession())) return;
  redirect(sanitizeInternalRedirectPath(next, DEFAULT_SIGNED_IN_ROUTE));
}
