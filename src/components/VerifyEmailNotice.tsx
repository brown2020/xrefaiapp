"use client";

import { useState } from "react";
import { getIdToken, sendEmailVerification } from "firebase/auth";
import toast from "react-hot-toast";
import { auth } from "@/firebase/firebaseClient";
import { persistIdTokenCookie } from "@/utils/authCookieClient";
import { UNVERIFIED_STARTER_CREDITS_MESSAGE } from "@/utils/starterCreditsMessage";
import useProfileStore from "@/zustand/useProfileStore";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui/FormInput";

/**
 * Explains a zero starter balance and sends Firebase's verification email.
 * The grant itself still reads `email_verified` from the ID token on the server.
 */
export function VerifyEmailNotice() {
  const profileLoaded = useProfileStore((s) => s.profileLoaded);
  const emailVerified = useProfileStore((s) => s.profile.emailVerified);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  if (!profileLoaded || emailVerified) return null;

  const send = async () => {
    const user = auth.currentUser;
    if (!user) {
      const errorMsg = "Sign in again, then verify your email.";
      setSendError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    setSending(true);
    setSendError(null);
    setEmailSent(false);
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/account`,
        handleCodeInApp: false,
      });
      setEmailSent(true);
      setSendError(null);
      toast.success("Verification email sent. Open the link, then choose I've verified.");
    } catch (error) {
      console.error("Verification email failed:", error);
      const errorMsg = "Could not send the verification email. Try again in a moment.";
      setSendError(errorMsg);
      setEmailSent(false);
      toast.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const recheck = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Sign in again, then verify your email.");
      return;
    }
    setChecking(true);
    try {
      await user.reload();
      const idToken = await getIdToken(user, true);
      const wrote = await persistIdTokenCookie(idToken);
      if (!wrote) {
        toast.error("Could not refresh your sign-in. Try again.");
        return;
      }
      await fetchProfile();
      if (useProfileStore.getState().profile.emailVerified) {
        toast.success("Email verified. Your starter credits are on this account.");
      } else {
        toast.error("That email is not verified yet. Open the link, then try again.");
      }
    } catch (error) {
      console.error("Verification check failed:", error);
      toast.error("Could not check verification. Try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-foreground">
      <p className="font-semibold">{UNVERIFIED_STARTER_CREDITS_MESSAGE}</p>
      <p className="mt-1 text-muted-foreground">
        This account stays at 0 starter credits until the verification link is opened.
        Google sign-in is verified when Google says so.
      </p>
      {emailSent && !sendError && (
        <div
          className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          role="status"
          aria-live="polite"
        >
          <p className="font-semibold">✓ Verification email sent</p>
          <p className="mt-1 text-emerald-600 dark:text-emerald-400">
            Check your inbox and click the link, then choose "I've verified" below.
          </p>
        </div>
      )}
      {sendError && (
        <div
          className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-700 dark:text-red-300"
          role="alert"
          aria-live="assertive"
        >
          <p className="font-semibold">✗ Error sending email</p>
          <p className="mt-1 text-red-600 dark:text-red-400">{sendError}</p>
        </div>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={primaryButtonClassName}
          onClick={() => void send()}
          disabled={sending || checking}
          aria-busy={sending}
        >
          {sending ? "Sending…" : "Send verification email"}
        </button>
        <button
          type="button"
          className={secondaryButtonClassName}
          onClick={() => void recheck()}
          disabled={sending || checking}
          aria-busy={checking}
        >
          {checking ? "Checking…" : "I've verified"}
        </button>
      </div>
    </div>
  );
}
