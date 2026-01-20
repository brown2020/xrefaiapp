import { useEffect, useRef, useCallback } from "react";
import { getIdToken } from "firebase/auth";
import { deleteCookie, setCookie } from "cookies-next";
import { debounce } from "lodash";
import { useAuthState } from "react-firebase-hooks/auth";
import { useAuthStore } from "@/zustand/useAuthStore";
import { auth } from "@/firebase/firebaseClient";
import { getAuthCookieName } from "@/utils/getAuthCookieName";

const useAuthToken = (cookieName = getAuthCookieName()) => {
  const [user, loading, error] = useAuthState(auth);
  const setAuthDetails = useAuthStore((state) => state.setAuthDetails);
  const clearAuthDetails = useAuthStore((state) => state.clearAuthDetails);
  const syncAuthProfile = useAuthStore((state) => state.syncAuthProfile);

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
      deleteCookie(cookieName);
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
      void syncAuthProfile(authDetails);
      // Ensure cookie is set and refresh scheduled whenever user is detected/updated
      void refreshAuthToken().then(scheduleTokenRefresh);
    } else {
      clearAuthDetails();
      deleteCookie(cookieName);
    }
  }, [
    clearAuthDetails,
    cookieName,
    setAuthDetails,
    syncAuthProfile,
    user,
    refreshAuthToken,
    scheduleTokenRefresh,
  ]);

  return { uid: user?.uid, loading, error };
};

export default useAuthToken;
