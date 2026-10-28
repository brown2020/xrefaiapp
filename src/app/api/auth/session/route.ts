import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/firebase/firebaseAdmin";
import { hasJwtShape, isTokenVerificationError } from "@/utils/authErrors";
import { authCookieName, authCookieOptions } from "@/utils/authCookie";
import { allowsUnverifiedSessionCookie } from "@/utils/sessionCookiePolicy";
import { sessionFromIdToken } from "@/utils/verifiedIdToken";

export const runtime = "nodejs";

function cookieSecure(req: NextRequest): boolean {
  return req.nextUrl.protocol === "https:";
}

function sessionResponse(req: NextRequest, idToken: string): NextResponse {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName(), idToken, authCookieOptions(cookieSecure(req)));
  return response;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }
  if (!hasJwtShape(idToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminConfigured()) {
    if (allowsUnverifiedSessionCookie()) {
      console.warn(
        "Admin credentials missing; setting unverified soft auth cookie (ALLOW_UNVERIFIED_SESSION_COOKIE)"
      );
      return sessionResponse(req, idToken);
    }
    console.error("Auth session unavailable: Firebase Admin credentials are not configured");
    return NextResponse.json(
      { error: "Sign-in is not available right now" },
      { status: 503 }
    );
  }

  try {
    await sessionFromIdToken(idToken);
  } catch (error) {
    if (
      isTokenVerificationError(error) ||
      (error instanceof Error && error.message === "AUTH_REQUIRED")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Auth session verification failed:", error);
    return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
  }

  return sessionResponse(req, idToken);
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName(), "", {
    ...authCookieOptions(cookieSecure(req)),
    maxAge: 0,
  });
  return response;
}
