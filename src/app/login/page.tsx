import type { Metadata } from "next";
import AuthPage from "@/components/auth/AuthPage";
import { DEFAULT_SIGNED_IN_ROUTE } from "@/constants/routes";
import { getSearchParam, type PageSearchParams } from "@/utils/queryParams";
import { sanitizeInternalRedirectPath } from "@/utils/redirectPath";

export const metadata: Metadata = { title: "Sign in | Xref.ai" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const next = sanitizeInternalRedirectPath(
    getSearchParam(params, "next"),
    DEFAULT_SIGNED_IN_ROUTE
  );
  return <AuthPage mode="signin" next={next} />;
}
