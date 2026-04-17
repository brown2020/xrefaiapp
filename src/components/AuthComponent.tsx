"use client";

import { useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { deleteCookie } from "cookies-next";

import Link from "next/link";
import { LockIcon, MailIcon, XIcon, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/zustand/useAuthStore";
import { auth } from "@/firebase/firebaseClient";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import toast from "react-hot-toast";

import googleLogo from "@/app/assets/google.svg";
import Image, { StaticImageData } from "next/image";
import { isIOSReactNativeWebView } from "@/utils/platform";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";

type AuthMode = "signin" | "signup";

export default function AuthComponent() {
  const setAuthDetails = useAuthStore((s) => s.setAuthDetails);
  const clearAuthDetails = useAuthStore((s) => s.clearAuthDetails);
  const uid = useAuthStore((s) => s.uid);
  const authEmail = useAuthStore((s) => s.authEmail);
  const authDisplayName = useAuthStore((s) => s.authDisplayName);
  const authPending = useAuthStore((s) => s.authPending);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isEmailLinkLogin, setIsEmailLinkLogin] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [showGoogleSignIn, setShowGoogleSignIn] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showModal = () => setIsVisible(true);
  const hideModal = () => setIsVisible(false);

  useEffect(() => {
    setShowGoogleSignIn(!isIOSReactNativeWebView());
  }, []);

  const ensureTermsAccepted = (): boolean => {
    if (!acceptTerms) {
      if (formRef.current) formRef.current.reportValidity();
      toast.error("Please accept the terms and privacy policy to continue.");
      return false;
    }
    return true;
  };

  const signInWithGoogle = async () => {
    if (!ensureTermsAccepted()) return;

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (isFirebaseError(error)) {
        if (error.code === "auth/account-exists-with-different-credential") {
          toast.error(
            "An account with the same email exists with a different sign-in provider."
          );
        } else if (error.code === "auth/popup-closed-by-user") {
          return;
        } else {
          toast.error(
            "Something went wrong signing in with Google\n" + error.message
          );
        }
      } else {
        toast.error("Something went wrong signing in with Google.");
      }
    } finally {
      hideModal();
    }
  };

  const handleSignOut = async () => {
    try {
      deleteCookie(getAuthCookieName());
      await signOut(auth);
      clearAuthDetails();
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("An error occurred while signing out.");
    } finally {
      hideModal();
    }
  };

  const persistSignupHints = () => {
    try {
      window.localStorage.setItem("xrefEmail", email);
      window.localStorage.setItem(
        "xrefName",
        name.trim() || email.split("@")[0] || ""
      );
    } catch {
      // localStorage may be unavailable (e.g. private mode). Non-fatal.
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ensureTermsAccepted()) return;
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        persistSignupHints();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        persistSignupHints();
      }
      hideModal();
    } catch (error: unknown) {
      const firebaseCode = isFirebaseError(error) ? error.code : "";

      if (firebaseCode === "auth/email-already-in-use") {
        toast("This email already has an account. Try signing in.", { icon: "ℹ️" });
        setAuthMode("signin");
        return;
      }
      if (
        firebaseCode === "auth/wrong-password" ||
        firebaseCode === "auth/invalid-credential"
      ) {
        toast.error(
          "Incorrect email or password. If you don't have an account, create one."
        );
        return;
      }
      if (firebaseCode === "auth/user-not-found") {
        toast(
          "No account for this email. Switched to create-account mode — click again to register.",
          { icon: "ℹ️" }
        );
        setAuthMode("signup");
        return;
      }
      if (firebaseCode === "auth/weak-password") {
        toast.error("Password is too weak. Try at least 8 characters.");
        return;
      }

      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthError = (error: unknown) => {
    if (isFirebaseError(error)) {
      toast.error(error.message);
    } else if (error instanceof Error) {
      toast.error(error.message);
    } else {
      toast.error("Authentication failed. Please try again.");
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error("Please enter your email to reset your password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`Password reset email sent to ${email}`);
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleEmailLinkSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!ensureTermsAccepted()) return;

    const actionCodeSettings = {
      url: `${window.location.origin}/loginfinish`,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("xrefEmail", email);
      window.localStorage.setItem("xrefName", name);
      setAuthDetails({ authPending: true });
      toast.success("Check your email for a sign-in link.");
    } catch (error) {
      console.error("Error sending sign-in link:", error);
      toast.error("Could not send sign-in link. Please try again.");
    }
  };

  const handleModeToggle = async () => {
    // When toggling modes we also try to suggest the right mode based on the
    // email (if one has been typed) to reduce the chance of a mismatch.
    const next: AuthMode = authMode === "signin" ? "signup" : "signin";
    setAuthMode(next);

    if (next === "signin" && email && email.includes("@")) {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length === 0) {
          toast(
            "No account found for this email. Consider creating one instead.",
            { icon: "ℹ️" }
          );
        }
      } catch {
        // Best-effort only.
      }
    }
  };

  return (
    <>
      {uid && (
        <button
          onClick={showModal}
          className="btn-muted max-w-md mx-auto text-white"
        >
          You are signed in
        </button>
      )}
      {!uid && (
        <button
          onClick={showModal}
          className="bg-[#02C173] hover:bg-[#009d5b] hover:opacity-100 btn-blue mt-0 w-auto flex items-center gap-2"
        >
          Sign In to Enable Your Account
          <ArrowRight size={16} />
        </button>
      )}

      <Modal
        isOpen={isVisible}
        onClose={hideModal}
        maxWidth="md"
        showCloseButton={false}
      >
        <div className="relative">
          <button
            onClick={hideModal}
            className="absolute top-0 right-0 p-2 hover:bg-gray-400 bg-gray-200 rounded-full -m-2 transition-colors"
            aria-label="Close"
          >
            <XIcon size={20} className="text-gray-800" />
          </button>

          {uid ? (
            <div className="flex flex-col gap-2 pt-2">
              <div className="text-2xl text-center">You are signed in</div>
              <div className="input-disabled">{authDisplayName}</div>
              <div className="input-disabled">{authEmail}</div>
              <button onClick={handleSignOut} className="btn-danger">
                Sign Out
              </button>
            </div>
          ) : authPending ? (
            <div className="flex flex-col gap-2 pt-2">
              <div className="text-2xl text-center">Signing you in</div>
              <div className="flex flex-col gap-3 border rounded-md px-3 py-2">
                <div>
                  {`Check your email at ${email} for a message from Xref.ai`}
                </div>
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

              <button onClick={handleSignOut} className="btn-danger">
                Start Over
              </button>
            </div>
          ) : (
            <form
              onSubmit={isEmailLinkLogin ? handleEmailLinkSubmit : handlePasswordSubmit}
              ref={formRef}
              className="flex flex-col gap-2 pt-2"
            >
              <div className="text-3xl text-center pb-3">
                {authMode === "signup" ? "Create Account" : "Sign In"}
              </div>

              {showGoogleSignIn && (
                <>
                  <AuthButton
                    label="Continue with Google"
                    logo={googleLogo}
                    onClick={signInWithGoogle}
                  />
                  <div className="flex items-center justify-center w-full h-12">
                    <hr className="grow h-px bg-gray-400 border-0" />
                    <span className="px-3">or</span>
                    <hr className="grow h-px bg-gray-400 border-0" />
                  </div>
                </>
              )}

              {isEmailLinkLogin && (
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="input-primary mb-2"
                />
              )}
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input-primary mt-2"
                autoComplete="email"
              />
              {!isEmailLinkLogin && (
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    authMode === "signup"
                      ? "Create a password (min. 8 chars)"
                      : "Enter your password"
                  }
                  className="input-primary mt-2"
                  autoComplete={
                    authMode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={authMode === "signup" ? 8 : undefined}
                />
              )}
              {!isEmailLinkLogin && authMode === "signin" && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="underline text-sm text-blue-600 hover:text-blue-800"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  isSubmitting || !email || (!isEmailLinkLogin && !password)
                }
              >
                {isEmailLinkLogin ? (
                  <div className="flex items-center gap-2 h-8">
                    <MailIcon size={20} />
                    <span>Continue with Email Link</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 h-8">
                    {isSubmitting ? (
                      <InlineSpinner size="sm" />
                    ) : (
                      <LockIcon size={20} />
                    )}
                    <span>
                      {authMode === "signup" ? "Create Account" : "Sign In"}
                    </span>
                  </div>
                )}
              </button>
              {!isEmailLinkLogin && (
                <div className="text-center text-sm">
                  {authMode === "signin"
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={handleModeToggle}
                    className="underline"
                  >
                    {authMode === "signin" ? "Create one" : "Sign in"}
                  </button>
                </div>
              )}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsEmailLinkLogin(!isEmailLinkLogin)}
                  className="underline"
                >
                  {isEmailLinkLogin ? "Use Email/Password" : "Use Email Link"}
                </button>
              </div>
              <label className="flex items-center space-x-2 pl-1">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="h-full"
                  required
                />
                <span>
                  I accept the{" "}
                  <Link href={"/terms"} className="underline">
                    terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline">
                    privacy
                  </Link>{" "}
                  policy.
                </span>
              </label>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}

function isFirebaseError(
  error: unknown
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

function AuthButton({
  label,
  logo,
  onClick,
}: {
  label: string;
  logo: StaticImageData;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 w-full px-4 py-2 border rounded-md hover:bg-gray-100"
      onClick={onClick}
    >
      <div className="w-6 h-6 relative">
        <Image
          src={logo}
          alt={`${label} logo`}
          className="object-contain"
          fill
          sizes="24px"
        />
      </div>
      <span className="grow text-center">{label}</span>
    </button>
  );
}
