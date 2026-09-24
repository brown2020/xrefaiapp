import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/firebaseAdmin";
import { hasJwtShape, isTokenVerificationError } from "@/utils/authErrors";
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

  // Reject obviously non-JWT tokens before touching Admin SDK so local/CI
  // builds without service-account credentials still return 401 (not 500).
  if (!hasJwtShape(idToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";
    const message = error instanceof Error ? error.message : String(error);
    const adminConfigMissing =
      code === "app/invalid-credential" ||
      /project_id|service account|Unable to detect a Project Id|Could not load the default credentials/i.test(
        message,
      );
    if (!adminConfigMissing) {
      console.error("Auth session verification failed:", error);
      return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
    }
    // Local/CI without Admin service-account secrets: set the soft-gate cookie
    // so proxy-protected routes work. Server actions still verify when Admin is configured.
    console.warn(
      "Admin credentials missing; setting soft auth cookie without verifyIdToken",
    );
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
