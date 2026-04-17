"use client";

import { useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";
import CookieConsent from "react-cookie-consent";
import { useRouter, usePathname } from "next/navigation";

import useAuthToken from "@/hooks/useAuthToken";
import { useInitializeStores } from "@/zustand/useInitializeStores";
import { useClientSetup } from "@/hooks/useClientSetup";
import ErrorBoundary from "./ErrorBoundary";
import { PROTECTED_ROUTES, ROUTES } from "@/constants/routes";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { CreditsPaywallModal } from "@/components/ui/CreditsPaywallModal";

/**
 * Client-side provider that handles:
 * - Auth token management
 * - Store initialization
 * - Cookie consent
 * - Toast notifications
 * - Redirect on logout from protected routes
 *
 * Route protection at the edge is handled by `proxy.ts`. This component
 * handles the runtime case where a user logs out while on a protected
 * route — we navigate them back to home.
 */
export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { loading, uid } = useAuthToken(getAuthCookieName());
  const router = useRouter();
  const pathname = usePathname();
  const wasAuthenticated = useRef(false);

  useInitializeStores();
  const { isClient, isWebView } = useClientSetup();

  useEffect(() => {
    if (loading) return;

    if (wasAuthenticated.current && !uid) {
      const isOnProtectedRoute = PROTECTED_ROUTES.some(
        (route) => pathname === route || pathname?.startsWith(`${route}/`)
      );

      if (isOnProtectedRoute) {
        router.push(ROUTES.home);
      }
    }

    wasAuthenticated.current = !!uid;
  }, [loading, uid, pathname, router]);

  return (
    <ErrorBoundary>
      {children}
      <CreditsPaywallModal />
      {isClient && !isWebView && (
        <CookieConsent>
          This app uses cookies to enhance the user experience.
        </CookieConsent>
      )}
      {isClient && <Toaster position="bottom-center" />}
    </ErrorBoundary>
  );
}
