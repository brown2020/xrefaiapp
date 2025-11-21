import { db } from "@/firebase/firebaseClient";
import { Timestamp, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { create } from "zustand";

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
  lastSignIn: Timestamp | null;
  premium: boolean;
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
  lastSignIn: null,
  premium: false,
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

    if (!uid) {
      return;
    }

    const persistableDetails: Partial<AuthState> = {};
    PERSISTED_KEYS.forEach((key) => {
      const value =
        overrides && overrides[key] !== undefined
          ? overrides[key]
          : currentState[key];
      if (value === undefined || value === null) {
        return;
      }

      (persistableDetails as Record<string, AuthState[typeof key]>)[key] =
        value as AuthState[typeof key];
    });

    await updateUserDetailsInFirestore(persistableDetails, uid);
  },
}));

async function updateUserDetailsInFirestore(
  details: Partial<AuthState>,
  uid: string
) {
  if (uid) {
    const userRef = doc(db, `users/${uid}`);

    // Sanitize the details object to exclude any functions
    const sanitizedDetails = { ...details };

    // Remove any unexpected functions or properties
    Object.keys(sanitizedDetails).forEach((key) => {
      if (typeof sanitizedDetails[key as keyof AuthState] === "function") {
        delete sanitizedDetails[key as keyof AuthState];
      }
    });

    console.log("Updating auth details in Firestore:", sanitizedDetails);
    try {
      await setDoc(
        userRef,
        { ...sanitizedDetails, lastSignIn: serverTimestamp() },
        { merge: true }
      );
      console.log("Auth details updated successfully in Firestore.");
    } catch (error) {
      console.error("Error updating auth details in Firestore:", error);
    }
  }
}
