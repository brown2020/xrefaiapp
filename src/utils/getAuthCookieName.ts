export const DEFAULT_AUTH_COOKIE_NAME = "xrefAuthToken" as const;

/**
 * Returns the cookie name used to store the Firebase ID token.
 *
 * Note: This uses a NEXT_PUBLIC env var because the name is needed on the
 * client and on the edge (`proxy.ts`). The token value is set only by
 * `POST /api/auth/session` as an HttpOnly cookie.
 */
export function getAuthCookieName(): string {
  const configured = process.env.NEXT_PUBLIC_COOKIE_NAME?.trim();
  return configured || DEFAULT_AUTH_COOKIE_NAME;
}


