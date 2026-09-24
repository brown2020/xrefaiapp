/**
 * Distinguishes a genuine ID-token validity failure from an infrastructure or
 * configuration error thrown by `adminAuth.verifyIdToken`.
 *
 * Only real token problems (expired/revoked/malformed/disabled user) should be
 * surfaced to clients as `AUTH_REQUIRED` (401). Network/Firebase outages must
 * NOT be reported as 401, or a backend incident looks like every user being
 * signed out. Those are rethrown and become a 5xx instead.
 */
const TOKEN_ERROR_CODES = new Set<string>([
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-id-token",
  "auth/argument-error",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
]);

/**
 * Cheap pre-check before the Admin SDK: three dot-separated segments with a
 * header and payload. The signature may be empty because the Firebase Auth
 * emulator issues unsigned tokens; `verifyIdToken` still rejects them in
 * production.
 */
export function hasJwtShape(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0;
}

export function isTokenVerificationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && TOKEN_ERROR_CODES.has(code);
}
