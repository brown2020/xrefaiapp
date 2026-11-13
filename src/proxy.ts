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
 * /login and /signup are not matched: cookie presence alone is not proof of a
 * session (a stale cookie would bounce a signed-out user away from sign-in).
 * Their server pages verify the cookie with the Admin SDK and redirect a
 * signed-in visitor (src/utils/signedInRedirect.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieName = getAuthCookieName();
  const token = request.cookies.get(cookieName)?.value;

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
