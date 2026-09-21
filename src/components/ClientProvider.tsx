"use client";

import { Toaster } from "react-hot-toast";
import CookieConsent from "react-cookie-consent";

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
        <CookieConsent buttonText="Accept cookies" ariaAcceptLabel="Accept cookies">
          This app uses cookies to enhance the user experience.
        </CookieConsent>
      )}
      {isClient && (
        <Toaster position="bottom-center" containerStyle={{ zIndex: 30000 }} />
      )}
    </ErrorBoundary>
  );
}
