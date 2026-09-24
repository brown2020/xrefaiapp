"use client";

import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAuthSession } from "@/components/auth/useAuthSession";
import { AuthCredentialsForm } from "@/components/auth/AuthCredentialsForm";
import { AuthPendingPanel } from "@/components/auth/AuthBits";

export default function AuthComponent() {
  const session = useAuthSession();
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
            <AuthPendingPanel email={email} onStartOver={handleSignOut} />
          ) : (
            <AuthCredentialsForm session={session} />
          )}
        </div>
      </Modal>
    </>
  );
}
