import { create } from "zustand";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useAuthStore } from "./useAuthStore";
import { db } from "@/firebase/firebaseClient";

export interface ProfileType {
  email: string;
  contactEmail: string;
  displayName: string;
  photoUrl: string;
  emailVerified: boolean;
  credits: number;
  fireworks_api_key: string;
  openai_api_key: string;
  stability_api_key: string;
  selectedAvatar: string;
  selectedTalkingPhoto: string;
  useCredits: boolean;
}

// Default profile template for filling missing values locally (not to overwrite Firestore)
const defaultProfile: ProfileType = {
  email: "",
  contactEmail: "",
  displayName: "",
  photoUrl: "",
  emailVerified: false,
  credits: 1000, // Only used if not set in Firestore
  fireworks_api_key: "",
  openai_api_key: "",
  stability_api_key: "",
  selectedAvatar: "",
  selectedTalkingPhoto: "",
  useCredits: true,
};

interface ProfileState {
  profile: ProfileType;
  fetchProfile: () => Promise<void>;
  updateProfile: (newProfile: Partial<ProfileType>) => Promise<void>;
  minusCredits: (amount: number) => Promise<boolean>;
  addCredits: (amount: number) => Promise<void>;
}

const useProfileStore = create<ProfileState>((set, get) => ({
  profile: defaultProfile,

  fetchProfile: async () => {
    const { uid, authEmail, authDisplayName, authPhotoUrl, authEmailVerified } =
      useAuthStore.getState();
    if (!uid) return;

    try {
      const userRef = doc(db, `users/${uid}/profile/userData`);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const firestoreProfile = docSnap.data() as Partial<ProfileType>;

        // Only apply defaults for fields missing in Firestore and not overwrite existing values
        const mergedProfile: ProfileType = {
          ...defaultProfile, // Default values are used only as fallback
          ...firestoreProfile, // Firestore values take precedence
          email: firestoreProfile.email || authEmail || "", // Use Firestore or auth state
          contactEmail: firestoreProfile.contactEmail || authEmail || "",
          displayName: firestoreProfile.displayName || authDisplayName || "",
          photoUrl: firestoreProfile.photoUrl || authPhotoUrl || "",
          emailVerified:
            firestoreProfile.emailVerified !== undefined
              ? firestoreProfile.emailVerified
              : authEmailVerified || false, // Ensure a boolean value
          credits: firestoreProfile.credits ?? 1000, // Default only if not set in Firestore
        };

        // Set the merged profile in local state without overwriting Firestore
        set({ profile: mergedProfile });
      } else {
        // If no profile exists, create a new profile in Firestore with default values
        const newProfile = createNewProfile(
          authEmail,
          authDisplayName,
          authPhotoUrl,
          authEmailVerified
        );
        console.log("No profile found. Creating new profile document.");

        await setDoc(userRef, newProfile); // Save the new profile to Firestore
        set({ profile: newProfile });
      }
    } catch (error) {
      handleProfileError("fetching or creating profile", error);
    }
  },

  updateProfile: async (newProfile: Partial<ProfileType>) => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return;

    try {
      const userRef = doc(db, `users/${uid}/profile/userData`);
      const updatedProfile = { ...get().profile, ...newProfile };

      // Update local state
      set({ profile: updatedProfile });

      // Update Firestore only for changed fields
      await updateDoc(userRef, newProfile);
      console.log("Profile updated successfully");
    } catch (error) {
      handleProfileError("updating profile", error);
    }
  },

  minusCredits: async (amount: number) => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return false;

    const profile = get().profile;
    if (profile.credits < amount) return false;

    try {
      const newCredits = profile.credits - amount;
      await updateCredits(uid, newCredits);
      set({ profile: { ...profile, credits: newCredits } });
      return true;
    } catch (error) {
      handleProfileError("using credits", error);
      return false;
    }
  },

  addCredits: async (amount: number) => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return;

    const profile = get().profile;
    const newCredits = profile.credits + amount;

    try {
      await updateCredits(uid, newCredits);
      set({ profile: { ...profile, credits: newCredits } });
    } catch (error) {
      handleProfileError("adding credits", error);
    }
  },
}));

// Helper function to create a new profile with defaults
function createNewProfile(
  authEmail?: string,
  authDisplayName?: string,
  authPhotoUrl?: string,
  authEmailVerified?: boolean
): ProfileType {
  return {
    email: authEmail || "",
    contactEmail: "",
    displayName: authDisplayName || "",
    photoUrl: authPhotoUrl || "",
    emailVerified: authEmailVerified || false,
    credits: 1000, // Default credits for new users
    fireworks_api_key: "",
    openai_api_key: "",
    stability_api_key: "",
    selectedAvatar: "",
    selectedTalkingPhoto: "",
    useCredits: true,
  };
}

// Helper function to update credits in Firestore
async function updateCredits(uid: string, credits: number): Promise<void> {
  const userRef = doc(db, `users/${uid}/profile/userData`);
  await updateDoc(userRef, { credits });
}

// Helper function to handle profile errors
function handleProfileError(action: string, error: unknown): void {
  const errorMessage =
    error instanceof Error ? error.message : "An unknown error occurred";
  console.error(`Error ${action}:`, errorMessage);
}

export default useProfileStore;
