import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protected routes that require authentication
 *
 * ⚠️ SYNC REQUIRED: Keep in sync with PROTECTED_ROUTES in constants/routes.ts
 * Next.js requires static string literals for the matcher config,
 * so we cannot import from constants. Run `npm run lint` to verify sync.
 */
const PROTECTED_ROUTE_PREFIXES = [
  "/chat",
  "/tools",
  "/history",
  "/account",
] as const;

/**
 * Next.js 16 Proxy (replaces middleware.ts)
 * Handles route protection at the edge level
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path starts with any of the protected routes
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Get the auth token from cookies
    const cookieName = process.env.NEXT_PUBLIC_COOKIE_NAME || "xrefAuthToken";
    const token = request.cookies.get(cookieName);

    // If no token is found, redirect to home page
    if (!token) {
      const url = new URL("/", request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

/**
 * Configure which paths the proxy runs on
 * Note: Next.js requires static string literals here - cannot use variables
 * Keep in sync with PROTECTED_ROUTE_PREFIXES above and PROTECTED_ROUTES in constants/routes.ts
 */
export const config = {
  matcher: [
    "/tools/:path*",
    "/chat/:path*",
    "/history/:path*",
    "/account/:path*",
  ],
};
