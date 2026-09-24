"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { ArrowRight } from "lucide-react";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { useAuthSession, type AuthMode } from "@/components/auth/useAuthSession";
import { AuthCredentialsForm } from "@/components/auth/AuthCredentialsForm";

function parseAuthMode(value: string | null | undefined): AuthMode | null {
  return value === "signin" || value === "signup" ? value : null;
}

/**
 * `?auth=signin|signup` opens the modal in that mode. Remounting on the param
 * applies it; closing drops the param so the same link works again.
 */
function AuthFromQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedMode = parseAuthMode(searchParams?.get("auth"));

  return (
    <AuthWidget
      key={requestedMode ?? "none"}
      requestedMode={requestedMode}
      onHide={
        requestedMode
          ? () => router.replace(ROUTES.home, { scroll: false })
          : undefined
      }
    />
  );
}

export default function AuthComponent() {
  return (
    <Suspense fallback={<AuthWidget requestedMode={null} />}>
      <AuthFromQuery />
    </Suspense>
  );
}

function AuthWidget({
  requestedMode,
  onHide,
}: {
  requestedMode: AuthMode | null;
  onHide?: () => void;
}) {
  const session = useAuthSession({
    initialMode: requestedMode ?? "signin",
    initialVisible: requestedMode !== null,
    onHide,
  });
  const { uid, authDisplayName, authEmail, authPending, email, isVisible, showModal, hideModal, handleSignOut } =
    session;

  return (
    <>
      {uid ? (
        <button
          type="button"
          onClick={showModal}
          aria-haspopup="dialog"
          aria-expanded={isVisible}
          className="btn-muted max-w-md mx-auto"
        >
          You are signed in
        </button>
      ) : (
        <button
          type="button"
          onClick={showModal}
          aria-haspopup="dialog"
          aria-expanded={isVisible}
          className="bg-[#02C173] hover:bg-[#009d5b] hover:opacity-100 btn-blue mt-0 w-auto flex items-center gap-2"
        >
          Sign In to Enable Your Account
          <ArrowRight size={16} />
        </button>
      )}

      <Modal isOpen={isVisible} onClose={hideModal} maxWidth="md">
        <div className="pt-3">
          {uid ? (
            <div className="flex flex-col gap-4">
              <div className="pr-10">
                <h2 className="text-2xl font-bold">You&apos;re signed in</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your account is ready on this device.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <div className="font-semibold">
                  {authDisplayName || "Xref.ai account"}
                </div>
                <div className="text-sm text-muted-foreground break-all">
                  {authEmail}
                </div>
              </div>
              <button type="button" onClick={handleSignOut} className="btn-danger mt-0">
                Sign Out
              </button>
            </div>
          ) : authPending ? (
            <div className="flex flex-col gap-4">
              <div className="pr-10">
                <h2 className="text-2xl font-bold">Check your email</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The sign-in link is waiting in your inbox.
                </p>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                <div>{`Check your email at ${email} for a message from Xref.ai`}</div>
                <div>
                  {`If you don't see the message, check your spam folder. Mark it "not spam" or move it to your inbox.`}
                </div>
                <div>
                  Click the sign-in link in the message to complete the sign-in
                  process.
                </div>
                <div className="flex items-center gap-2">
                  <span>Waiting for you to click the sign-in link.</span>
                  <InlineSpinner size="sm" />
                </div>
              </div>
              <button type="button" onClick={handleSignOut} className="btn-danger mt-0">
                Start Over
              </button>
            </div>
          ) : (
            <AuthCredentialsForm session={session} />
          )}
        </div>
      </Modal>
    </>
  );
}
