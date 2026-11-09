import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthPage from "@/components/auth/AuthPage";
import { DEFAULT_SIGNED_IN_ROUTE } from "@/constants/routes";
import { getSearchParam, type PageSearchParams } from "@/utils/queryParams";
import { sanitizeInternalRedirectPath } from "@/utils/redirectPath";
import { getAuthCookieName } from "@/utils/getAuthCookieName";

export const metadata: Metadata = { title: "Sign in | Xref.ai" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  // Server-side validation: sanitizeInternalRedirectPath enforces same-origin relative paths.
  // Validation rules:
  // - Must start with single '/' (not '//' or '/\')
  // - No URL scheme allowed
  // - Normalized via new URL(path, base) and origin must match
  // - Rejects control characters, backslashes, protocol-relative, and absolute URLs
  // If invalid, falls back to DEFAULT_SIGNED_IN_ROUTE.
  const next = sanitizeInternalRedirectPath(
    getSearchParam(params, "next"),
    DEFAULT_SIGNED_IN_ROUTE
  );
  
  // Server-side redirect for already-signed-in users.
  // Check: Cookie presence only (UX redirect). Does not validate token here.
  // A stale/invalid cookie will be caught by the protected route's middleware,
  // which will redirect back with a fresh ?next parameter, avoiding loops.
  const cookieName = getAuthCookieName();
  const authCookie = (await cookies()).get(cookieName);
  if (authCookie?.value) {
    // Safe: `next` is validated above via sanitizeInternalRedirectPath
    redirect(next);
  }
  
  return <AuthPage mode="signin" next={next} />;
}
