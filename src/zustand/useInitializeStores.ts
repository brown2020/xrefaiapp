import { useEffect, useRef } from "react";
import { useAuthStore } from "./useAuthStore";
import useProfileStore from "./useProfileStore";
import { usePaymentsStore } from "./usePaymentsStore";
import { PROFILE_SYNC_TIMEOUT_MS } from "@/constants";

export const useInitializeStores = () => {
  const uid = useAuthStore((state) => state.uid);
  const profileSyncStatus = useAuthStore((state) => state.profileSyncStatus);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const resetProfile = useProfileStore((state) => state.resetProfile);
  const resetPayments = usePaymentsStore((state) => state.resetPayments);
  const hasFetchedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset fetch flag when uid changes (new user or logout)
    hasFetchedRef.current = false;
    resetProfile();
    resetPayments();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [resetPayments, resetProfile, uid]);

  useEffect(() => {
    if (!uid || hasFetchedRef.current) return;

    const doFetch = async () => {
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      try {
        await fetchProfile();
      } catch (error) {
        // Allow retries on next sync status change.
        hasFetchedRef.current = false;
        console.error("Initial profile fetch failed:", error);
      }
    };

    if (profileSyncStatus === "synced" || profileSyncStatus === "error") {
      void doFetch();
      return;
    }

    if (profileSyncStatus === "syncing" || profileSyncStatus === "idle") {
      timeoutRef.current = setTimeout(() => {
        console.warn("Profile sync timeout, fetching profile anyway");
        void doFetch();
      }, PROFILE_SYNC_TIMEOUT_MS);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [fetchProfile, uid, profileSyncStatus]);
};
