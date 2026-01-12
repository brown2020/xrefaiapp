"use client";

import { useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";
import CookieConsent from "react-cookie-consent";
import { useRouter, usePathname } from "next/navigation";

import useAuthToken from "@/hooks/useAuthToken";
import { useInitializeStores } from "@/zustand/useInitializeStores";
import { useClientSetup } from "@/hooks/useClientSetup";
import ErrorBoundary from "./ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PROTECTED_ROUTES, ROUTES } from "@/constants/routes";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { CreditsPaywallModal } from "@/components/ui/CreditsPaywallModal";

/**
 * Client-side provider that handles:
 * - Auth token management
 * - Store initialization
 * - Loading states
 * - Cookie consent
 * - Toast notifications
 * - Redirect on logout from protected routes
 *
 * Note: Initial route protection is handled by proxy.ts at the edge level.
 * This component handles redirect when user logs out while on a protected route.
 */
export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { loading, uid } = useAuthToken(getAuthCookieName());
  const router = useRouter();
  const pathname = usePathname();
  const wasAuthenticated = useRef(false);

  useInitializeStores();
  const { isClient, isWebView } = useClientSetup();

  // Track authentication state and redirect on logout from protected routes
  useEffect(() => {
    if (loading) return;

    // Check if user just logged out (was authenticated, now isn't)
    if (wasAuthenticated.current && !uid) {
      const isOnProtectedRoute = PROTECTED_ROUTES.some(
        (route) => pathname === route || pathname?.startsWith(`${route}/`)
      );

      if (isOnProtectedRoute) {
        router.push(ROUTES.home);
      }
    }

    // Update the ref for next comparison
    wasAuthenticated.current = !!uid;
  }, [loading, uid, pathname, router]);

  if (loading)
    return (
      <ErrorBoundary>
        <div className="flex flex-col items-center justify-center h-full bg-background">
          <LoadingSpinner size="xl" />
        </div>
      </ErrorBoundary>
    );

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
