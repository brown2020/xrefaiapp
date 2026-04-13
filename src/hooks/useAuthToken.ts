import { useEffect, useRef, useCallback } from "react";
import { getIdToken } from "firebase/auth";
import { deleteCookie, setCookie } from "cookies-next";
import { debounce } from "lodash";
import { useAuthState } from "react-firebase-hooks/auth";
import { useAuthStore } from "@/zustand/useAuthStore";
import useProfileStore from "@/zustand/useProfileStore";
import { usePaymentsStore } from "@/zustand/usePaymentsStore";
import { auth } from "@/firebase/firebaseClient";
import { getAuthCookieName } from "@/utils/getAuthCookieName";

const useAuthToken = (cookieName = getAuthCookieName()) => {
  const [user, loading, error] = useAuthState(auth);
  const setAuthDetails = useAuthStore((state) => state.setAuthDetails);
  const clearAuthDetails = useAuthStore((state) => state.clearAuthDetails);
  const syncAuthProfile = useAuthStore((state) => state.syncAuthProfile);
  const resetProfile = useProfileStore((state) => state.resetProfile);
  const resetPayments = usePaymentsStore((state) => state.resetPayments);

  const refreshInterval = 50 * 60 * 1000; // 50 minutes
  const lastTokenRefresh = `lastTokenRefresh_${cookieName}`;

  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAuthToken = useCallback(async () => {
    try {
      if (!auth.currentUser) throw new Error("No user found");
      const idTokenResult = await getIdToken(auth.currentUser, true);

      const isSecure =
        process.env.NODE_ENV === "production" &&
        window.location.protocol === "https:";
      setCookie(cookieName, idTokenResult, {
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days — cookie persists across browser restarts; token is refreshed every 50 min
      });
      if (!window.ReactNativeWebView) {
        window.localStorage.setItem(lastTokenRefresh, Date.now().toString());
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error("Error refreshing token");
      }
      deleteCookie(cookieName, { path: "/" });
    }
  }, [cookieName, lastTokenRefresh]);

  const scheduleTokenRefresh = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    if (document.visibilityState === "visible" && auth.currentUser) {
      activityTimeoutRef.current = setTimeout(
        () => void refreshAuthToken(),
        refreshInterval
      );
    }
  }, [refreshAuthToken, refreshInterval]);

  useEffect(() => {
    const handleStorageChange = debounce((e: StorageEvent) => {
      if (e.key === lastTokenRefresh) {
        scheduleTokenRefresh();
      }
    }, 1000);

    if (!window.ReactNativeWebView) {
      window.addEventListener("storage", handleStorageChange);
    }

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      handleStorageChange.cancel();
    };
  }, [scheduleTokenRefresh, lastTokenRefresh]);

  useEffect(() => {
    const handleVisibility = () => scheduleTokenRefresh();
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [scheduleTokenRefresh]);

  useEffect(() => {
    if (user?.uid) {
      const authDetails = {
        uid: user.uid,
        authEmail: user.email || "",
        authDisplayName: user.displayName || "",
        authPhotoUrl: user.photoURL || "",
        authEmailVerified: user.emailVerified || false,
        authReady: true,
        authPending: false,
      };
      setAuthDetails(authDetails);
      void (async () => {
        await refreshAuthToken();
        await syncAuthProfile(authDetails);
        scheduleTokenRefresh();
      })();
    } else {
      resetProfile();
      resetPayments();
      clearAuthDetails();
      deleteCookie(cookieName, { path: "/" });
    }
  }, [
    clearAuthDetails,
    cookieName,
    resetPayments,
    resetProfile,
    setAuthDetails,
    syncAuthProfile,
    user,
    refreshAuthToken,
    scheduleTokenRefresh,
  ]);

  return { uid: user?.uid, loading, error };
};

export default useAuthToken;
