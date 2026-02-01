import { useEffect, useRef } from "react";
import { useAuthStore } from "./useAuthStore";
import useProfileStore from "./useProfileStore";

/** Timeout for waiting for profile sync (5 seconds) */
const SYNC_TIMEOUT_MS = 5000;

export const useInitializeStores = () => {
  const uid = useAuthStore((state) => state.uid);
  const profileSyncStatus = useAuthStore((state) => state.profileSyncStatus);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const hasFetchedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset fetch flag when uid changes (new user or logout)
    hasFetchedRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [uid]);

  useEffect(() => {
    if (!uid || hasFetchedRef.current) return;

    // Function to perform the fetch
    const doFetch = () => {
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      fetchProfile();
    };

    // If sync is complete or errored, fetch immediately
    if (profileSyncStatus === "synced" || profileSyncStatus === "error") {
      doFetch();
      return;
    }

    // If sync is idle (shouldn't happen normally) or syncing, wait
    if (profileSyncStatus === "syncing" || profileSyncStatus === "idle") {
      // Set a timeout as fallback in case sync never completes
      timeoutRef.current = setTimeout(() => {
        console.warn("Profile sync timeout, fetching profile anyway");
        doFetch();
      }, SYNC_TIMEOUT_MS);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [fetchProfile, uid, profileSyncStatus]);
};
