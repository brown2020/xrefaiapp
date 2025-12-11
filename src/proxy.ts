import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = ["/tools", "/chat", "/history", "/account"];

  // Check if the current path starts with any of the protected routes
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Get the auth token from cookies
    // We use the environment variable or fallback to the default name 'xrefAuthToken'
    const cookieName = process.env.NEXT_PUBLIC_COOKIE_NAME || "xrefAuthToken";
    const token = request.cookies.get(cookieName);

    // If no token is found, redirect to home page immediately
    if (!token) {
      const url = new URL("/", request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Configure which paths the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all protected routes and their sub-paths
     */
    "/tools/:path*",
    "/chat/:path*",
    "/history/:path*",
    "/account/:path*",
  ],
};
