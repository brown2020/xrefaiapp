import { create } from "zustand";
import { syncAuthProfileServer } from "@/actions/serverAuthSync";

/** Status of profile synchronization to prevent race conditions */
export type ProfileSyncStatus = "idle" | "syncing" | "synced" | "error";

interface AuthState {
  uid: string;
  firebaseUid: string;
  authEmail: string;
  authDisplayName: string;
  authPhotoUrl: string;
  authEmailVerified: boolean;
  authReady: boolean;
  authPending: boolean;
  isAdmin: boolean;
  isAllowed: boolean;
  isInvited: boolean;
  premium: boolean;
  /** Tracks the status of profile sync to coordinate with profile fetching */
  profileSyncStatus: ProfileSyncStatus;
}

interface AuthActions {
  setAuthDetails: (details: Partial<AuthState>) => void;
  clearAuthDetails: () => void;
  syncAuthProfile: (details?: Partial<AuthState>) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

const defaultAuthState: AuthState = {
  uid: "",
  firebaseUid: "",
  authEmail: "",
  authDisplayName: "",
  authPhotoUrl: "",
  authEmailVerified: false,
  authReady: false,
  authPending: false,
  isAdmin: false,
  isAllowed: false,
  isInvited: false,
  premium: false,
  profileSyncStatus: "idle",
};

const PERSISTED_KEYS: (keyof AuthState)[] = [
  "authEmail",
  "authDisplayName",
  "authPhotoUrl",
  "authEmailVerified",
  "firebaseUid",
  "isAdmin",
  "isAllowed",
  "isInvited",
  "premium",
];

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...defaultAuthState,

  setAuthDetails: (details: Partial<AuthState>) => {
    set((state) => ({ ...state, ...details }));
  },

  clearAuthDetails: () => set({ ...defaultAuthState }),

  syncAuthProfile: async (overrides?: Partial<AuthState>) => {
    const currentState = get();
    const uid = overrides?.uid || currentState.uid;

    if (!uid) return;

    set({ profileSyncStatus: "syncing" });

    const persistableDetails: Record<string, unknown> = {};
    PERSISTED_KEYS.forEach((key) => {
      const value =
        overrides && overrides[key] !== undefined
          ? overrides[key]
          : currentState[key];
      if (value === undefined || value === null) return;
      persistableDetails[key] = value;
    });

    try {
      await syncAuthProfileServer(uid, persistableDetails);
      set({ profileSyncStatus: "synced" });
    } catch (error) {
      console.error("Failed to sync auth profile:", error);
      set({ profileSyncStatus: "error" });
    }
  },
}));
