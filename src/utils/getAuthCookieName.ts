export const DEFAULT_AUTH_COOKIE_NAME = "xrefAuthToken" as const;

/**
 * Returns the cookie name used to store the Firebase ID token.
 *
 * Note: This uses a NEXT_PUBLIC env var because it's needed on the client
 * (e.g., `cookies-next`) and on the edge (`proxy.ts`).
 */
export function getAuthCookieName(): string {
  const configured = process.env.NEXT_PUBLIC_COOKIE_NAME?.trim();
  return configured || DEFAULT_AUTH_COOKIE_NAME;
}


