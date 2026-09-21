"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ROUTES, isProtectedPath } from "@/constants/routes";
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
import { persistIdTokenCookie, clearAuthCookie } from "@/utils/authCookieClient";
import { useAuthStore } from "@/zustand/useAuthStore";
import { auth } from "@/firebase/firebaseClient";
import toast from "react-hot-toast";
import { isIOSReactNativeWebView } from "@/utils/platform";

export type AuthMode = "signin" | "signup";
export type AuthFeedback = {
  tone: "error" | "info" | "success";
  message: string;
} | null;

function subscribeNoop() {
  return () => {};
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

export function useAuthSession() {
const router = useRouter();
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
    const wrote = await persistIdTokenCookie(idToken);
    if (!wrote) {
      throw new Error("Failed to persist auth cookie after sign-in.");
    }
  } catch (err) {
    console.error("Failed to persist auth cookie after sign-in:", err);
  }
};

const showGoogleSignIn = useSyncExternalStore(
  subscribeNoop,
  () => !isIOSReactNativeWebView(),
  () => true
);

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
    await clearAuthCookie();
    await signOut(auth);
    clearAuthDetails();
    if (isProtectedPath(window.location.pathname)) router.replace(ROUTES.home);
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

  return {
    uid,
    authEmail,
    authDisplayName,
    authPending,
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    isVisible,
    isEmailLinkLogin,
    setIsEmailLinkLogin,
    authMode,
    showGoogleSignIn,
    isSubmitting,
    authFeedback,
    clearAuthFeedback,
    showModal,
    hideModal,
    signInWithGoogle,
    handleSignOut,
    handlePasswordSubmit,
    handlePasswordReset,
    handleEmailLinkSubmit,
    selectAuthMode,
    isSignup,
    modalTitle,
    modalSubtitle,
  };
}
