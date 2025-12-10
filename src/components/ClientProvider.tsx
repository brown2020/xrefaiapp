"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import CookieConsent from "react-cookie-consent";

import useAuthToken from "@/hooks/useAuthToken";
import { useInitializeStores } from "@/zustand/useInitializeStores";
import ErrorBoundary from "./ErrorBoundary";
import { usePathname, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return isClient;
};

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { loading, uid } = useAuthToken(process.env.NEXT_PUBLIC_COOKIE_NAME!);
  const router = useRouter();
  const pathname = usePathname();
  useInitializeStores();
  const isClient = useIsClient();
  const [isWebView, setIsWebView] = useState(false);

  useEffect(() => {
    function adjustHeight() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }

    window.addEventListener("resize", adjustHeight);
    window.addEventListener("orientationchange", adjustHeight);

    // Initial adjustment
    adjustHeight();

    // Cleanup
    return () => {
      window.removeEventListener("resize", adjustHeight);
      window.removeEventListener("orientationchange", adjustHeight);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsWebView(Boolean(window.ReactNativeWebView));
  }, []);

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
