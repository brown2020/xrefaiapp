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
} from "firebase/auth";

import Link from "next/link";
import { LockIcon, MailIcon, XIcon, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/zustand/useAuthStore";
import { auth } from "@/firebase/firebaseClient";
import toast from "react-hot-toast";

import googleLogo from "@/app/assets/google.svg";
import Image from "next/image";
import { isIOSReactNativeWebView } from "@/utils/platform";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";

export default function AuthComponent() {
  const setAuthDetails = useAuthStore((s) => s.setAuthDetails);
  const clearAuthDetails = useAuthStore((s) => s.clearAuthDetails);
  const uid = useAuthStore((s) => s.uid);
  const authEmail = useAuthStore((s) => s.authEmail);
  const authDisplayName = useAuthStore((s) => s.authDisplayName);
  const authPending = useAuthStore((s) => s.authPending);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isEmailLinkLogin, setIsEmailLinkLogin] = useState(false);
  const [showGoogleSignIn, setShowGoogleSignIn] = useState(true); // State to control Google Sign-In visibility

  const showModal = () => setIsVisible(true);
  const hideModal = () => setIsVisible(false);

  useEffect(() => {
    // Hide Google Sign-In button and the divider if in a React Native WebView on iOS
    setShowGoogleSignIn(!isIOSReactNativeWebView());
  }, []);

  const signInWithGoogle = async () => {
    if (!acceptTerms) {
      if (formRef.current) {
        formRef.current.reportValidity();
      }
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (isFirebaseError(error)) {
        if (error.code === "auth/account-exists-with-different-credential") {
          toast.error(
            "An account with the same email exists with a different sign-in provider."
          );
        } else {
          toast.error(
            "Something went wrong signing in with Google\n" + error.message
          );
        }
      }
    } finally {
      hideModal();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      clearAuthDetails();
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("An error occurred while signing out.");
    } finally {
      hideModal();
    }
  };

  const handlePasswordSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if this is likely an existing email (contains @ and domain)
    const isLikelyExistingEmail = email.includes("@") && email.split("@")[1];

    try {
      if (isLikelyExistingEmail) {
        // If it looks like an existing email, try to sign in first
        await signInWithEmailAndPassword(auth, email, password);
        window.localStorage.setItem("xrefEmail", email);
        window.localStorage.setItem("xrefName", email.split("@")[0]);
      } else {
        // Otherwise try to create a new account
        await createUserWithEmailAndPassword(auth, email, password);
        window.localStorage.setItem("xrefEmail", email);
        window.localStorage.setItem("xrefName", email.split("@")[0]);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorCode = (error as { code?: string }).code;

        if (errorCode === "auth/email-already-in-use") {
          // Email exists but we tried to create an account
          toast(
            `An account with this email already exists. Please sign in with your password.`,
            { icon: "ℹ️" }
          );
          const passwordInput = document.getElementById(
            "password"
          ) as HTMLInputElement;
          if (passwordInput) {
            passwordInput.focus();
          }
          return;
        } else if (errorCode === "auth/user-not-found") {
          // Email doesn't exist but we tried to sign in
          try {
            // Try to create a new account instead
            await createUserWithEmailAndPassword(auth, email, password);
            window.localStorage.setItem("xrefEmail", email);
            window.localStorage.setItem("xrefName", email.split("@")[0]);
            return;
          } catch (signupError) {
            handleAuthError(signupError);
          }
        } else if (errorCode === "auth/wrong-password") {
          toast.error(
            "Incorrect password. Please try again or reset your password."
          );
          return;
        } else {
          handleAuthError(error);
        }
      } else {
        handleAuthError(error);
      }
    } finally {
      if (
        !document.activeElement ||
        (document.activeElement as HTMLElement).id !== "password"
      ) {
        hideModal();
      }
    }
  };

  const handleAuthError = (error: unknown) => {
    if (isFirebaseError(error)) {
      toast.error(error.message);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
                <div>{`Check your email at ${email} for a message from Xref.ai`}</div>
                <div>{`If you don't see the message, check your spam folder. Mark it "not spam" or move it to your inbox.`}</div>
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
              onSubmit={isEmailLinkLogin ? handleSubmit : handlePasswordSignup}
              ref={formRef}
              className="flex flex-col gap-2 pt-2"
            >
              <div className="text-3xl text-center pb-3">Sign In</div>

              {/* Conditionally render Google Sign-In and divider */}
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
              />
              {!isEmailLinkLogin && (
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-primary mt-2"
                />
              )}
              {!isEmailLinkLogin && (
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
                disabled={!email || (!isEmailLinkLogin && !password)}
              >
                {isEmailLinkLogin ? (
                  <div className="flex items-center gap-2 h-8">
                    <MailIcon size={20} />
                    <span>Continue with Email Link</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 h-8">
                    <LockIcon size={20} />
                    <span>
                      Sign{" "}
                      {email.includes("@") && email.split("@")[1] ? "In" : "Up"}{" "}
                      with Password
                    </span>
                  </div>
                )}
              </button>
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
  logo: string;
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
          height={100}
          width={100}
          alt={`${label} logo`}
          objectFit="contain"
        />
      </div>
      <span className="grow text-center">{label}</span>
    </button>
  );
}
