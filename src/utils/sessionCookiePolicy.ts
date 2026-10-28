/**
 * Local/CI opt-in only. Production must never accept an unverified soft-gate cookie.
 */
export function allowsUnverifiedSessionCookieFrom(
  nodeEnv: string | undefined,
  flag: string | undefined
): boolean {
  return nodeEnv !== "production" && flag === "true";
}

export function allowsUnverifiedSessionCookie(): boolean {
  return allowsUnverifiedSessionCookieFrom(
    process.env.NODE_ENV,
    process.env.ALLOW_UNVERIFIED_SESSION_COOKIE
  );
}
