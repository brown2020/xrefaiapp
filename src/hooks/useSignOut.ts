"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { auth } from "@/firebase/firebaseClient";
import { clearAuthCookie } from "@/utils/authCookieClient";
import { useAuthStore } from "@/zustand/useAuthStore";
import { ROUTES, isProtectedPath } from "@/constants/routes";

/** Clears the session cookie, signs out of Firebase, and resets auth state. */
export async function signOutUser(): Promise<void> {
  await clearAuthCookie();
  await signOut(auth);
  useAuthStore.getState().clearAuthDetails();
}

/** Signs out and leaves protected pages. Resolves false after showing an error toast. */
export function useSignOut() {
  const router = useRouter();

  return useCallback(async (): Promise<boolean> => {
    try {
      await signOutUser();
      if (isProtectedPath(window.location.pathname)) router.replace(ROUTES.home);
      return true;
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("An error occurred while signing out.");
      return false;
    }
  }, [router]);
}
