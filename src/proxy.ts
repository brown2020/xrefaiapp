import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { PROTECTED_ROUTES, ROUTES } from "@/constants/routes";

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * Handles route protection at the edge level.
 *
 * Note: This is a soft gate — it only checks whether an auth cookie is
 * present. Actual token verification happens in server actions / API
 * route handlers. Tampered cookies will be rejected there.
 * 
 * For /login and /signup: Does NOT auto-redirect already-signed-in users.
 * Instead, pages render and show explicit confirmation UI with "Continue to <page>" button.
 * This provides explicit user confirmation for URL-influenced redirects.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieName = getAuthCookieName();
  const token = request.cookies.get(cookieName)?.value;

  // Login and signup pages: Let them render even if signed in
  // They will show "You're already signed in" with explicit "Continue to <page>" button
  // This satisfies url-prefilled-privileged-action's requirement for explicit confirmation

  // Handle protected routes (require auth)
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    if (!token) {
      const url = new URL(ROUTES.login, request.url);
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

/**
 * Configure which paths the proxy runs on.
 * Note: Next.js requires static string literals here — cannot use variables.
 * Keep in sync with `PROTECTED_ROUTES` in constants/routes.ts.
 */
export const config = {
  matcher: [
    "/tools/:path*",
    "/chat/:path*",
    "/history/:path*",
    "/account/:path*",
    "/payment-attempt/:path*",
    "/payment-success/:path*",
  ],
};
