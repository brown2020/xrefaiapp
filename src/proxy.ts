import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { PROTECTED_ROUTES, ROUTES, DEFAULT_SIGNED_IN_ROUTE } from "@/constants/routes";

/**
 * Explicit allowlist of valid post-login redirect destinations.
 * Must match the allowlist in src/utils/redirectPath.ts.
 */
const ALLOWED_REDIRECT_PATHS = [
  ROUTES.chat,
  ROUTES.tools,
  ROUTES.history,
  ROUTES.account,
  ROUTES.paymentSuccess,
] as const;

/**
 * Validates redirect path against allowlist and returns the matched ROUTES constant.
 * Returns null if not allowed.
 */
function getValidatedRedirectPath(pathname: string): string | null {
  // Exact match
  for (const allowed of ALLOWED_REDIRECT_PATHS) {
    if (pathname === allowed) return allowed;
  }
  
  // Dynamic segment match (e.g. /chat/123 → /chat)
  for (const allowed of ALLOWED_REDIRECT_PATHS) {
    if (pathname.startsWith(`${allowed}/`)) return allowed;
  }
  
  return null;
}

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * Handles route protection at the edge level.
 *
 * Note: This is a soft gate — it only checks whether an auth cookie is
 * present. Actual token verification happens in server actions / API
 * route handlers. Tampered cookies will be rejected there.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const cookieName = getAuthCookieName();
  const token = request.cookies.get(cookieName)?.value;

  // Handle already-signed-in users visiting login/signup pages
  if ((pathname === ROUTES.login || pathname === ROUTES.signup) && token) {
    const nextParam = searchParams.get("next");
    let redirectPath: string = DEFAULT_SIGNED_IN_ROUTE;
    
    if (nextParam) {
      // Validate against allowlist - only redirect to allowlisted ROUTES constants
      const validated = getValidatedRedirectPath(nextParam);
      if (validated) {
        redirectPath = validated;
      }
    }
    
    // Use the allowlisted constant for redirect
    const url = new URL(redirectPath, request.url);
    return NextResponse.redirect(url);
  }

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
 * Also includes /login and /signup for already-signed-in redirect handling.
 */
export const config = {
  matcher: [
    "/login",
    "/signup",
    "/tools/:path*",
    "/chat/:path*",
    "/history/:path*",
    "/account/:path*",
    "/payment-attempt/:path*",
    "/payment-success/:path*",
  ],
};
