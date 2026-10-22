"use client";

import Link from "next/link";
import { Toaster } from "react-hot-toast";
import CookieConsent from "react-cookie-consent";

import { ROUTES } from "@/constants/routes";
import useAuthToken from "@/hooks/useAuthToken";
import { useInitializeStores } from "@/zustand/useInitializeStores";
import { useClientSetup } from "@/hooks/useClientSetup";
import ErrorBoundary from "./ErrorBoundary";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { CreditsPaywallModal } from "@/components/ui/CreditsPaywallModal";

/**
 * Client-side provider that handles:
 * - Auth token management
 * - Store initialization
 * - Cookie consent
 * - Toast notifications
 *
 * Route protection at the edge is handled by `proxy.ts`. Sign-out buttons
 * navigate home from protected pages in their click handlers.
 */
export function ClientProvider({ children }: { children: React.ReactNode }) {
  useAuthToken(getAuthCookieName());

  useInitializeStores();
  const { isClient, isWebView } = useClientSetup();

  return (
    <ErrorBoundary>
      {children}
      <CreditsPaywallModal />
      {isClient && !isWebView && (
        <CookieConsent
          buttonText="Accept cookies"
          ariaAcceptLabel="Accept cookies"
          disableStyles
          containerClasses="cookie-banner fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground shadow-lg sm:flex-row sm:items-center sm:justify-between"
          contentClasses="leading-6"
          buttonWrapperClasses="shrink-0"
          buttonClasses="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
        >
          We use cookies to keep you signed in and improve Xref.ai. See our{" "}
          <Link href={ROUTES.privacy} className="font-medium underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </CookieConsent>
      )}
      {isClient && (
        <Toaster position="top-center" containerStyle={{ zIndex: 30000 }} />
      )}
    </ErrorBoundary>
  );
}
