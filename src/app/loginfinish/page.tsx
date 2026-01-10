"use client";

import { useAuthStore } from "@/zustand/useAuthStore";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  getIdToken,
} from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import useProfileStore from "@/zustand/useProfileStore";
import { setCookie } from "cookies-next";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import toast from "react-hot-toast";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoginFinishPage() {
  const router = useRouter();
  const setAuthDetails = useAuthStore((s) => s.setAuthDetails);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  type Stage = "checking" | "needs_email" | "signing_in" | "error";
  const [stage, setStage] = useState<Stage>("checking");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [storedName, setStoredName] = useState("");

  const clearStoredEmailLinkDetails = useCallback(() => {
    window.localStorage.removeItem("xrefEmail");
    window.localStorage.removeItem("xrefName");
  }, []);

  const formatAuthError = useCallback((error: unknown) => {
    if (error instanceof FirebaseError) return error.message;
    if (error instanceof Error) return error.message;
    return "Unknown error signing in";
  }, []);

  const completeSignIn = useCallback(
    async (confirmedEmail: string) => {
      setErrorMessage("");
      setStage("signing_in");

      try {
        if (!isSignInWithEmailLink(auth, window.location.href)) {
          throw new Error("Sign-in link is not valid or has expired.");
        }

        const userCredential = await signInWithEmailLink(
          auth,
          confirmedEmail,
          window.location.href
        );

        const user = userCredential.user;
        const authEmail = user?.email;
        const uid = user?.uid;
        const selectedName = storedName || user?.displayName || "";

        if (!uid || !authEmail) {
          throw new Error("No user found after sign-in.");
        }

        // Explicitly set cookie before redirect to avoid race condition with proxy
        const token = await getIdToken(user, true);
        const cookieName = getAuthCookieName();
        const isSecure =
          process.env.NODE_ENV === "production" &&
          window.location.protocol === "https:";

        setCookie(cookieName, token, {
          secure: isSecure,
          sameSite: "lax",
          path: "/",
        });

        setAuthDetails({
          uid,
          authEmail,
          authDisplayName: selectedName,
          authPending: false,
        });
        updateProfile({ displayName: selectedName });

        clearStoredEmailLinkDetails();
        toast.success("Signed in successfully.");
        router.replace(ROUTES.tools);
      } catch (error) {
        const message = formatAuthError(error);
        setErrorMessage(message);
        setStage("error");
        toast.error(message);
      }
    },
    [
      clearStoredEmailLinkDetails,
      formatAuthError,
      router,
      setAuthDetails,
      storedName,
      updateProfile,
    ]
  );

  useEffect(() => {
    setStoredName(window.localStorage.getItem("xrefName") || "");
    const storedEmail = window.localStorage.getItem("xrefEmail") || "";

    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setStage("error");
      setErrorMessage("Sign-in link is not valid or has expired.");
      return;
    }

    if (!storedEmail) {
      setStage("needs_email");
      return;
    }

    setEmail(storedEmail);
    void completeSignIn(storedEmail);
  }, [completeSignIn]);

  return (
    <main className="min-h-full flex items-center justify-center px-4 py-10 bg-gray-50/30">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#041D34]">
            Completing sign-in
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            We&apos;re verifying your email link.
          </p>
        </div>

        {stage === "checking" || stage === "signing_in" ? (
          <div className="py-6">
            <LoadingSpinner
              size="lg"
              text={stage === "checking" ? "Checking link..." : "Signing you in..."}
            />
          </div>
        ) : null}

        {stage === "needs_email" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = email.trim();
              if (!trimmed) return;
              void completeSignIn(trimmed);
            }}
            className="space-y-4"
          >
            <div className="text-sm text-gray-600">
              For security, please confirm the email address you used to request
              the sign-in link.
            </div>
            <label className="block">
              <span className="text-sm font-medium text-[#041D34]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="you@example.com"
                required
              />
            </label>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#192449] text-white font-semibold rounded-xl hover:bg-[#263566] transition-colors"
            >
              Continue
            </button>
            <div className="text-center text-sm">
              <Link href={ROUTES.home} className="text-blue-600 hover:underline">
                Back to home
              </Link>
            </div>
          </form>
        ) : null}

        {stage === "error" ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
              {errorMessage || "Sign-in failed. Please try again."}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setStage("needs_email");
                }}
                className="w-full py-3 px-4 bg-[#192449] text-white font-semibold rounded-xl hover:bg-[#263566] transition-colors"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  clearStoredEmailLinkDetails();
                  router.replace(ROUTES.home);
                }}
                className="w-full py-3 px-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Start over
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
