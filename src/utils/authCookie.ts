import { getAuthCookieName } from "@/utils/getAuthCookieName";

export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function authCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  };
}

export function authCookieName(): string {
  return getAuthCookieName();
}
