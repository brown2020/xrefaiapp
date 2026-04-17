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

/**
 * Writes the Firebase ID token to the auth cookie synchronously relative to
 * the caller. Returns a promise that resolves once the cookie has been set
 * (or rejected on an unambiguous invalid-token error).
 *
 * This is broken out of the hook so sign-in paths can `await` it before
 * navigating to a protected route.
 */
async function writeAuthCookie(
  cookieName: string
): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const idToken = await getIdToken(user, /* forceRefresh */ true);
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
    return true;
  } catch (err: unknown) {
    const firebaseCode = isFirebaseError(err) ? err.code : "";
    if (firebaseCode && TOKEN_INVALID_CODES.has(firebaseCode)) {
      // Firebase explicitly says the token is invalid — safe to clear.
      deleteCookie(cookieName, { path: "/" });
    } else if (err instanceof Error) {
      // Transient (network, offline, CORS) — KEEP the existing cookie
      // so the user isn't logged out by a flaky connection.
      console.error("Token refresh failed:", err.message);
    } else {
      console.error("Token refresh failed");
    }
    return false;
  }
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
    const wrote = await writeAuthCookie(cookieName);
    if (!wrote) return;
    try {
      if (typeof window !== "undefined" && !window.ReactNativeWebView) {
        window.localStorage.setItem(lastTokenRefreshKey, Date.now().toString());
      }
    } catch {
      // Ignore localStorage errors (private mode, quota, etc.).
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
    // CRITICAL: do not touch the cookie while Firebase is still hydrating
    // auth state from IndexedDB. During hydration `user` is null but that
    // doesn't mean the user is signed out — wiping the cookie here causes
    // the proxy to redirect protected routes to home on every page load.
    if (loading) return;

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
        // Writing the cookie is the critical side-effect — do it first so
        // any subsequent navigation to a protected route has the cookie
        // available for the edge proxy. Profile sync is secondary and can
        // happen after.
        await refreshAuthToken();
        await syncAuthProfile(authDetails);
        scheduleTokenRefresh();
      })();
    } else {
      // Genuine signed-out state (loading === false && user === null).
      resetProfile();
      resetPayments();
      clearAuthDetails();
      deleteCookie(cookieName, { path: "/" });
    }
  }, [
    clearAuthDetails,
    cookieName,
    loading,
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
