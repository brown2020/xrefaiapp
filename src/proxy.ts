import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { PROTECTED_ROUTES } from "@/constants/routes";

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * Handles route protection at the edge level.
 *
 * Note: This is a soft gate — it only checks whether an auth cookie is
 * present. Actual token verification happens in server actions / API
 * route handlers. Tampered cookies will be rejected there.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    const cookieName = getAuthCookieName();
    const token = request.cookies.get(cookieName)?.value;

    if (!token) {
      const url = new URL("/", request.url);
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
