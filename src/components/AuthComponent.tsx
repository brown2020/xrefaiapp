"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  getIdToken,
  sendSignInLinkToEmail,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  updateProfile as updateFirebaseProfile,
  type User,
} from "firebase/auth";
import { deleteCookie, setCookie } from "cookies-next";

import Link from "next/link";
import {
  AlertCircle,
  LockIcon,
  MailIcon,
  ArrowRight,
  UserIcon,
} from "lucide-react";
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
type AuthFeedback = {
  tone: "error" | "info" | "success";
  message: string;
} | null;

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
  const [isVisible, setIsVisible] = useState(false);
  const [isEmailLinkLogin, setIsEmailLinkLogin] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [showGoogleSignIn, setShowGoogleSignIn] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback>(null);

  const clearAuthFeedback = () => setAuthFeedback(null);
  const showModal = () => {
    clearAuthFeedback();
    setIsVisible(true);
  };
  const hideModal = () => {
    clearAuthFeedback();
    setIsVisible(false);
  };

  /**
   * Write the auth cookie immediately after sign-in so the edge proxy can
   * see it on the very next navigation. Without this, `useAuthToken`'s
   * effect races with the user clicking a protected link and the proxy
   * redirects to home because the cookie isn't there yet.
   */
  const persistAuthCookie = async (user: User): Promise<void> => {
    try {
      const idToken = await getIdToken(user, /* forceRefresh */ true);
      const isSecure =
        process.env.NODE_ENV === "production" &&
        window.location.protocol === "https:";
      setCookie(getAuthCookieName(), idToken, {
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    } catch (err) {
      console.error("Failed to persist auth cookie after sign-in:", err);
    }
  };

  useEffect(() => {
    setShowGoogleSignIn(!isIOSReactNativeWebView());
  }, []);

  const signInWithGoogle = async () => {
    clearAuthFeedback();
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      if (credential.user) {
        await persistAuthCookie(credential.user);
      }
      hideModal();
    } catch (error) {
      if (isFirebaseError(error)) {
        if (error.code === "auth/account-exists-with-different-credential") {
          setAuthFeedback({
            tone: "error",
            message:
              "An account with the same email exists with a different sign-in provider.",
          });
        } else if (error.code === "auth/popup-closed-by-user") {
          return;
        } else {
          setAuthFeedback({
            tone: "error",
            message:
              "Something went wrong signing in with Google. Please try again.",
          });
        }
      } else {
        setAuthFeedback({
          tone: "error",
          message: "Something went wrong signing in with Google.",
        });
      }
    }
  };

  const handleSignOut = async () => {
    try {
      deleteCookie(getAuthCookieName(), { path: "/" });
      await signOut(auth);
      clearAuthDetails();
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("An error occurred while signing out.");
    } finally {
      hideModal();
    }
  };

  const persistSignupHints = (nextEmail: string, nextName: string) => {
    try {
      window.localStorage.setItem("xrefEmail", nextEmail);
      window.localStorage.setItem(
        "xrefName",
        nextName || nextEmail.split("@")[0] || ""
      );
    } catch {
      // localStorage may be unavailable (e.g. private mode). Non-fatal.
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail || !password) return;

    clearAuthFeedback();
    setIsSubmitting(true);
    try {
      const credential =
        authMode === "signup"
          ? await createUserWithEmailAndPassword(auth, trimmedEmail, password)
          : await signInWithEmailAndPassword(auth, trimmedEmail, password);

      if (credential.user) {
        if (authMode === "signup" && trimmedName) {
          await updateFirebaseProfile(credential.user, {
            displayName: trimmedName,
          });
          persistSignupHints(trimmedEmail, trimmedName);
        }
        await persistAuthCookie(credential.user);
      }
      hideModal();
    } catch (error: unknown) {
      const firebaseCode = isFirebaseError(error) ? error.code : "";

      if (firebaseCode === "auth/email-already-in-use") {
        setAuthFeedback({
          tone: "info",
          message: "This email already has an account. Try signing in.",
        });
        setAuthMode("signin");
        return;
      }
      if (
        firebaseCode === "auth/wrong-password" ||
        firebaseCode === "auth/invalid-credential"
      ) {
        setAuthFeedback({
          tone: "error",
          message:
            "Incorrect email or password. If you don't have an account, create one.",
        });
        return;
      }
      if (firebaseCode === "auth/user-not-found") {
        setAuthFeedback({
          tone: "info",
          message:
            "No account was found for this email. Create an account to continue.",
        });
        setAuthMode("signup");
        return;
      }
      if (firebaseCode === "auth/weak-password") {
        setAuthFeedback({
          tone: "error",
          message: "Password is too weak. Try at least 8 characters.",
        });
        return;
      }

      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthError = (error: unknown) => {
    if (isFirebaseError(error)) {
      setAuthFeedback({ tone: "error", message: error.message });
    } else if (error instanceof Error) {
      setAuthFeedback({ tone: "error", message: error.message });
    } else {
      setAuthFeedback({
        tone: "error",
        message: "Authentication failed. Please try again.",
      });
    }
  };

  const handlePasswordReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthFeedback({
        tone: "error",
        message: "Please enter your email to reset your password.",
      });
      return;
    }
    clearAuthFeedback();
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setAuthFeedback({
        tone: "success",
        message: `Password reset email sent to ${trimmedEmail}.`,
      });
      toast.success(`Password reset email sent to ${trimmedEmail}`);
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleEmailLinkSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail) return;
    setEmail(trimmedEmail);
    clearAuthFeedback();

    const actionCodeSettings = {
      url: `${window.location.origin}/loginfinish`,
      handleCodeInApp: true,
    };

    setIsSubmitting(true);
    try {
      await sendSignInLinkToEmail(auth, trimmedEmail, actionCodeSettings);
      persistSignupHints(trimmedEmail, trimmedName);
      setAuthDetails({ authPending: true });
      toast.success("Check your email for a sign-in link.");
    } catch (error) {
      console.error("Error sending sign-in link:", error);
      setAuthFeedback({
        tone: "error",
        message: "Could not send sign-in link. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectAuthMode = async (next: AuthMode) => {
    if (next === authMode) return;

    // When toggling modes we also try to suggest the right mode based on the
    // email (if one has been typed) to reduce the chance of a mismatch.
    clearAuthFeedback();
    setAuthMode(next);

    if (next === "signin" && email && email.includes("@")) {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length === 0) {
          setAuthFeedback({
            tone: "info",
            message:
              "No account found for this email. Consider creating one instead.",
          });
        }
      } catch {
        // Best-effort only.
      }
    }
  };

  const isSignup = authMode === "signup";
  const modalTitle = isEmailLinkLogin
    ? "Sign in with email"
    : isSignup
      ? "Create your account"
      : "Welcome back";
  const modalSubtitle = isEmailLinkLogin
    ? "We'll send a secure link to your inbox."
    : isSignup
      ? "Set up your Xref.ai account in a few seconds."
      : "Access your Xref.ai account.";

  return (
    <>
      {uid && (
        <button
          type="button"
          onClick={showModal}
          aria-haspopup="dialog"
          aria-expanded={isVisible}
          className="btn-muted max-w-md mx-auto text-white"
        >
          You are signed in
        </button>
      )}
      {!uid && (
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

      <Modal
        isOpen={isVisible}
        onClose={hideModal}
        maxWidth="md"
      >
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

              <button type="button" onClick={handleSignOut} className="btn-danger mt-0">
                Start Over
              </button>
            </div>
          ) : (
            <form
              onSubmit={isEmailLinkLogin ? handleEmailLinkSubmit : handlePasswordSubmit}
              className="flex flex-col gap-4"
            >
              <div className="pr-10">
                <h2 className="text-2xl font-bold">{modalTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {modalSubtitle}
                </p>
              </div>

              {!isEmailLinkLogin && (
                <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => void selectAuthMode("signin")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30 ${
                      authMode === "signin"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={authMode === "signin"}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => void selectAuthMode("signup")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30 ${
                      authMode === "signup"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={authMode === "signup"}
                  >
                    Create account
                  </button>
                </div>
              )}

              {authFeedback && <AuthFeedbackMessage feedback={authFeedback} />}

              {showGoogleSignIn && (
                <>
                  <AuthButton
                    label="Continue with Google"
                    logo={googleLogo}
                    onClick={signInWithGoogle}
                  />
                  <div className="flex items-center justify-center w-full">
                    <hr className="grow h-px border-0 bg-border" />
                    <span className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      or
                    </span>
                    <hr className="grow h-px border-0 bg-border" />
                  </div>
                </>
              )}

              {(isSignup || isEmailLinkLogin) && (
                <label className="block">
                  <span className="text-sm font-medium text-foreground">
                    Name <span className="text-muted-foreground">(optional)</span>
                  </span>
                  <div className="relative mt-1">
                    <UserIcon
                      size={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearAuthFeedback();
                      }}
                      placeholder="Jane Doe"
                      className="input-primary pl-10"
                      autoComplete="name"
                    />
                  </div>
                </label>
              )}
              <label className="block">
                <span className="text-sm font-medium text-foreground">Email</span>
                <div className="relative mt-1">
                  <MailIcon
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearAuthFeedback();
                    }}
                    placeholder="you@example.com"
                    className="input-primary pl-10"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>
              {!isEmailLinkLogin && (
                <label className="block">
                  <span className="text-sm font-medium text-foreground">
                    Password
                  </span>
                  <div className="relative mt-1">
                    <LockIcon
                      size={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearAuthFeedback();
                      }}
                      placeholder={
                        authMode === "signup"
                          ? "At least 8 characters"
                          : "Enter your password"
                      }
                      className="input-primary pl-10"
                      autoComplete={
                        authMode === "signup"
                          ? "new-password"
                          : "current-password"
                      }
                      minLength={authMode === "signup" ? 8 : undefined}
                      required
                    />
                  </div>
                </label>
              )}
              {!isEmailLinkLogin && authMode === "signin" && (
                <div className="-mt-2 text-right">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Forgot password?
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
                    {isSubmitting ? (
                      <InlineSpinner size="sm" />
                    ) : (
                      <MailIcon size={20} />
                    )}
                    <span>Email me a sign-in link</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 h-8">
                    {isSubmitting ? (
                      <InlineSpinner size="sm" />
                    ) : (
                      <LockIcon size={20} />
                    )}
                    <span>
                      {authMode === "signup" ? "Create account" : "Sign in"}
                    </span>
                  </div>
                )}
              </button>
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    clearAuthFeedback();
                    setIsEmailLinkLogin(!isEmailLinkLogin);
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  {isEmailLinkLogin
                    ? "Use password instead"
                    : "Email me a sign-in link instead"}
                </button>
              </div>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                By continuing, you accept our{" "}
                <Link
                  href="/terms"
                  className="mx-0.5 font-medium text-foreground underline"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="mx-0.5 font-medium text-foreground underline"
                >
                  Privacy Policy
                </Link>.
              </p>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}

function AuthFeedbackMessage({ feedback }: { feedback: Exclude<AuthFeedback, null> }) {
  const toneClasses = {
    error: "border-red-200 bg-red-50 text-red-950",
    info: "border-blue-200 bg-blue-50 text-blue-950",
    success: "border-green-200 bg-green-50 text-green-950",
  };

  const iconClasses = {
    error: "text-red-600",
    info: "text-blue-600",
    success: "text-green-700",
  };

  return (
    <div
      role={feedback.tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium leading-5 ${toneClasses[feedback.tone]}`}
    >
      <AlertCircle
        className={`mt-0.5 h-5 w-5 shrink-0 ${iconClasses[feedback.tone]}`}
        aria-hidden="true"
      />
      <span>{feedback.message}</span>
    </div>
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
      className="grid min-h-12 w-full grid-cols-[24px_1fr_24px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 font-semibold text-foreground transition-colors hover:bg-muted focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30"
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
      <span className="text-center">{label}</span>
      <span aria-hidden="true" />
    </button>
  );
}
