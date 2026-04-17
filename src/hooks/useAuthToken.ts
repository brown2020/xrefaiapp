import { useCallback, useEffect, useRef } from "react";
import { getIdToken } from "firebase/auth";
import { deleteCookie, setCookie } from "cookies-next";
import { debounce } from "lodash";
import { useAuthState } from "react-firebase-hooks/auth";
import { useAuthStore } from "@/zustand/useAuthStore";
import useProfileStore from "@/zustand/useProfileStore";
import { usePaymentsStore } from "@/zustand/usePaymentsStore";
import { auth } from "@/firebase/firebaseClient";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import { TOKEN_REFRESH_INTERVAL_MS } from "@/constants";

/** Error codes from firebase-auth that unambiguously mean "token is invalid". */
const TOKEN_INVALID_CODES = new Set([
  "auth/user-token-expired",
  "auth/invalid-user-token",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/invalid-credential",
]);

function isFirebaseError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

const useAuthToken = (cookieName = getAuthCookieName()) => {
  const [user, loading, error] = useAuthState(auth);
  const setAuthDetails = useAuthStore((state) => state.setAuthDetails);
  const clearAuthDetails = useAuthStore((state) => state.clearAuthDetails);
  const syncAuthProfile = useAuthStore((state) => state.syncAuthProfile);
  const resetProfile = useProfileStore((state) => state.resetProfile);
  const resetPayments = usePaymentsStore((state) => state.resetPayments);

  const lastTokenRefreshKey = `lastTokenRefresh_${cookieName}`;
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAuthToken = useCallback(async () => {
    try {
      if (!auth.currentUser) return;
      const idToken = await getIdToken(auth.currentUser, true);

      const isSecure =
        process.env.NODE_ENV === "production" &&
        typeof window !== "undefined" &&
        window.location.protocol === "https:";
      setCookie(cookieName, idToken, {
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      try {
        if (typeof window !== "undefined" && !window.ReactNativeWebView) {
          window.localStorage.setItem(lastTokenRefreshKey, Date.now().toString());
        }
      } catch {
        // Ignore localStorage errors (private mode, quota, etc.).
      }
    } catch (err: unknown) {
      const firebaseCode = isFirebaseError(err) ? err.code : "";
      if (firebaseCode && TOKEN_INVALID_CODES.has(firebaseCode)) {
        // Only clear the cookie when Firebase explicitly tells us the token
        // is no longer valid. Transient network errors should NOT wipe the
        // cookie and force the user to sign in again.
        deleteCookie(cookieName);
      } else if (err instanceof Error) {
        console.error("Token refresh failed:", err.message);
      } else {
        console.error("Token refresh failed");
      }
    }
  }, [cookieName, lastTokenRefreshKey]);

  const scheduleTokenRefresh = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      auth.currentUser
    ) {
      activityTimeoutRef.current = setTimeout(
        () => void refreshAuthToken(),
        TOKEN_REFRESH_INTERVAL_MS
      );
    }
  }, [refreshAuthToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = debounce((e: StorageEvent) => {
      // When another tab refreshed the token, we don't need to refresh
      // again — just reschedule our own timer to align with the new token.
      if (e.key === lastTokenRefreshKey) {
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
  }, [scheduleTokenRefresh, lastTokenRefreshKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocus = () => {
      // When the user returns to the tab, aggressively refresh the token
      // since it may have expired while we were hidden (Firebase tokens
      // only last ~1 h). We then schedule the normal periodic refresh.
      if (document.visibilityState === "visible" && auth.currentUser) {
        void refreshAuthToken();
        scheduleTokenRefresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [refreshAuthToken, scheduleTokenRefresh]);

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
      deleteCookie(cookieName);
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
