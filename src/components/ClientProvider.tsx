"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import CookieConsent from "react-cookie-consent";

import useAuthToken from "@/hooks/useAuthToken";
import { useInitializeStores } from "@/zustand/useInitializeStores";
import { useClientSetup } from "@/hooks/useClientSetup";
import ErrorBoundary from "./ErrorBoundary";
import { usePathname, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { loading, uid } = useAuthToken(process.env.NEXT_PUBLIC_COOKIE_NAME!);
  const router = useRouter();
  const pathname = usePathname();
  useInitializeStores();
  const { isClient, isWebView } = useClientSetup();

  useEffect(() => {
    if (
      !loading &&
      !uid &&
      pathname != "/" &&
      !pathname.includes("images/") &&
      !pathname.includes("/about") &&
      !pathname.includes("/terms") &&
      !pathname.includes("/privacy")
    ) {
      router.push("/");
    }
  }, [loading, pathname, router, uid]);

  if (loading)
    return (
      <ErrorBoundary>
        <div className="flex flex-col items-center justify-center h-full bg-white">
          <LoadingSpinner size="xl" />
        </div>
      </ErrorBoundary>
    );

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full">
        {children}
        {isClient && !isWebView && (
          <CookieConsent>
            This app uses cookies to enhance the user experience.
          </CookieConsent>
        )}
        {isClient && <Toaster position="bottom-center" />}
      </div>
    </ErrorBoundary>
  );
}
