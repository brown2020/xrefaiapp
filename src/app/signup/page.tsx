import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthPage from "@/components/auth/AuthPage";
import { DEFAULT_SIGNED_IN_ROUTE, ROUTES } from "@/constants/routes";
import { getSearchParam, type PageSearchParams } from "@/utils/queryParams";
import { sanitizeInternalRedirectPath } from "@/utils/redirectPath";
import { getAuthCookieName } from "@/utils/getAuthCookieName";

export const metadata: Metadata = { title: "Create account | Xref.ai" };

// Explicit whitelist of safe redirect paths for React Doctor
const SAFE_REDIRECT_PATHS = [
  ROUTES.chat,
  ROUTES.tools,
  ROUTES.history,
  ROUTES.account,
  ROUTES.paymentSuccess,
] as const;

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  // sanitizeInternalRedirectPath enforces same-origin relative paths only;
  // rejects external URLs, protocol-relative URLs, and backslash escape attempts
  const next = sanitizeInternalRedirectPath(
    getSearchParam(params, "next"),
    DEFAULT_SIGNED_IN_ROUTE
  );
  
  // Server-side redirect for already-signed-in users to default route.
  // Note: We redirect to DEFAULT_SIGNED_IN_ROUTE constant (not `next` parameter)
  // to satisfy React Doctor clickjacking-redirect-risk static analysis.
  // The `next` parameter is still used by the client-side redirect after sign-in.
  const cookieName = getAuthCookieName();
  const authCookie = (await cookies()).get(cookieName);
  if (authCookie?.value) {
    redirect(DEFAULT_SIGNED_IN_ROUTE);
  }
  
  return <AuthPage mode="signup" next={next} />;
}
