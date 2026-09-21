import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/firebaseAdmin";
import { isTokenVerificationError } from "@/utils/authErrors";
import { authCookieName, authCookieOptions } from "@/utils/authCookie";

export const runtime = "nodejs";

function cookieSecure(req: NextRequest): boolean {
  return req.nextUrl.protocol === "https:";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (error) {
    if (isTokenVerificationError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Auth session verification failed:", error);
    return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName(), idToken, authCookieOptions(cookieSecure(req)));
  return response;
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName(), "", {
    ...authCookieOptions(cookieSecure(req)),
    maxAge: 0,
  });
  return response;
}
