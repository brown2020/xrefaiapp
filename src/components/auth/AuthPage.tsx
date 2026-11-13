"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuthSession, type AuthMode } from "@/components/auth/useAuthSession";
import { AuthCredentialsForm } from "@/components/auth/AuthCredentialsForm";
import { AuthPendingPanel } from "@/components/auth/AuthBits";
import { ProtectedLink } from "@/components/ui/ProtectedLink";
import {
  ROUTE_DISPLAY_NAMES,
  sanitizeInternalRedirectPath,
  validateAgainstAllowlist,
} from "@/utils/redirectPath";
import { DEFAULT_SIGNED_IN_ROUTE } from "@/constants/routes";
import { useAuthStore } from "@/zustand/useAuthStore";

/**
 * Full-page sign-in or sign-up. `next` must already be a sanitized internal path.
 * A visitor whose auth cookie verifies is redirected by the server page before
 * this renders.
 */
export default function AuthPage({ mode, next }: { mode: AuthMode; next: string }) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const hasRedirected = useRef(false);
  const sessionRecheckRequested = useAuthStore((s) => s.sessionRecheckRequested);
  const setAuthDetails = useAuthStore((s) => s.setAuthDetails);

  // Re-sanitize on the client so only allowlisted same-origin routes are ever navigated to.
  const safeNext = sanitizeInternalRedirectPath(next, DEFAULT_SIGNED_IN_ROUTE);
  const targetRoute =
    validateAgainstAllowlist(safeNext.split(/[?#]/, 1)[0]) || DEFAULT_SIGNED_IN_ROUTE;
  const displayName = ROUTE_DISPLAY_NAMES[targetRoute] || "Dashboard";

  const session = useAuthSession({
    initialMode: mode,
    onSignedIn: () => {
      if (hasRedirected.current) return;
      hasRedirected.current = true;
      setRedirecting(true);
      // A full load, not router.replace: the client router may hold a protected
      // route's redirect to /login, cached by the proxy before the cookie
      // existed. Replaying it here would bounce between /login and `next`.
      window.location.assign(safeNext);
    },
  });
  const { uid, authEmail, authPending, sessionReady, isSubmitting, email, handleSignOut } =
    session;

  // The server rendered this page because the cookie it received was missing
  // or stale (ID tokens expire hourly). Once Firebase restores the user and the
  // session route has verified and stored a fresh token, re-render on the
  // server so it can verify that cookie and redirect. Once per stored session,
  // across remounts: if the server still cannot verify it, the Continue link
  // below remains.
  useEffect(() => {
    if (!uid || !sessionReady || isSubmitting || hasRedirected.current) return;
    if (sessionRecheckRequested) return;
    setAuthDetails({ sessionRecheckRequested: true });
    router.refresh();
  }, [uid, sessionReady, isSubmitting, sessionRecheckRequested, setAuthDetails, router]);

  return (
    <main className="min-h-full bg-muted/30 px-5 py-12 md:py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        {redirecting ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </div>
        ) : uid ? (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold">You&apos;re already signed in</h1>
              <p className="mt-1 break-all text-sm text-muted-foreground">{authEmail}</p>
            </div>
            <ProtectedLink
              href={safeNext}
              className="btn-primary mt-0 text-center"
              data-testid="continue-button"
              data-target-path={safeNext}
            >
              Continue to {displayName}
            </ProtectedLink>
            <button type="button" onClick={handleSignOut} className="btn-muted mt-0">
              Sign out
            </button>
          </div>
        ) : authPending ? (
          <AuthPendingPanel email={email} onStartOver={handleSignOut} />
        ) : (
          <AuthCredentialsForm session={session} titleAs="h1" />
        )}
      </div>
    </main>
  );
}
