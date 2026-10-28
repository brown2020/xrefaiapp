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

  if (!profileLoaded || emailVerified) return null;

  const send = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Sign in again, then verify your email.");
      return;
    }
    setSending(true);
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/account`,
        handleCodeInApp: false,
      });
      toast.success("Verification email sent. Open the link, then choose I've verified.");
    } catch (error) {
      console.error("Verification email failed:", error);
      toast.error("Could not send the verification email. Try again in a moment.");
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
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={primaryButtonClassName}
          onClick={() => void send()}
          disabled={sending || checking}
        >
          {sending ? "Sending…" : "Send verification email"}
        </button>
        <button
          type="button"
          className={secondaryButtonClassName}
          onClick={() => void recheck()}
          disabled={sending || checking}
        >
          {checking ? "Checking…" : "I've verified"}
        </button>
      </div>
    </div>
  );
}
