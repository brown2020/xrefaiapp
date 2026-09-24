const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-email": "Enter your email address.",
  "auth/missing-password": "Enter your password.",
  "auth/user-not-found": "No account was found for this email.",
  "auth/too-many-requests":
    "Too many attempts. Wait a few minutes, then try again.",
  "auth/network-request-failed":
    "We couldn't reach the sign-in service. Check your connection and try again.",
  "auth/user-disabled": "This account has been disabled. Contact support.",
  "auth/operation-not-allowed":
    "This sign-in method is not available right now.",
  "auth/popup-blocked":
    "Your browser blocked the sign-in window. Allow pop-ups and try again.",
  "auth/internal-error": "Something went wrong. Please try again.",
  "auth/invalid-action-code":
    "This sign-in link is invalid or was already used. Request a new one.",
  "auth/expired-action-code": "This sign-in link has expired. Request a new one.",
};

export const GENERIC_AUTH_ERROR = "Something went wrong. Please try again.";

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function authErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

/** Maps a Firebase Auth failure to a short message. Never returns provider text. */
export function friendlyAuthError(error: unknown): string {
  return AUTH_ERROR_MESSAGES[authErrorCode(error)] ?? GENERIC_AUTH_ERROR;
}
