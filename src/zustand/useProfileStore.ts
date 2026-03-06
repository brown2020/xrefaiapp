import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";
import type { AiModelKey } from "@/ai/models";
import {
  fetchProfileServer,
  updateProfileServer,
  deleteAccountServer,
} from "@/actions/serverProfile";

export interface ProfileType {
  email: string;
  contactEmail: string;
  displayName: string;
  photoUrl: string;
  emailVerified: boolean;
  credits: number;
  fireworks_api_key: string;
  openai_api_key: string;
  anthropic_api_key: string;
  xai_api_key: string;
  google_api_key: string;
  stability_api_key: string;
  selectedAvatar: string;
  selectedTalkingPhoto: string;
  useCredits: boolean;
  text_model: AiModelKey;
  firstName?: string;
  lastName?: string;
  headerUrl?: string;
}

const defaultProfile: ProfileType = {
  email: "",
  contactEmail: "",
  displayName: "",
  photoUrl: "",
  emailVerified: false,
  credits: 1000,
  fireworks_api_key: "",
  openai_api_key: "",
  anthropic_api_key: "",
  xai_api_key: "",
  google_api_key: "",
  stability_api_key: "",
  selectedAvatar: "",
  selectedTalkingPhoto: "",
  useCredits: true,
  text_model: "openai:gpt-5.4",
};

interface ProfileState {
  profile: ProfileType;
  fetchProfile: () => Promise<void>;
  resetProfile: () => void;
  updateProfile: (newProfile: Partial<ProfileType>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

let profileUpdateQueue: Promise<void> = Promise.resolve();

const useProfileStore = create<ProfileState>((set, get) => ({
  profile: defaultProfile,

  fetchProfile: async () => {
    const { uid, authEmail, authDisplayName, authPhotoUrl, authEmailVerified } =
      useAuthStore.getState();
    if (!uid) {
      set({ profile: defaultProfile });
      return;
    }

    try {
      const profile = await fetchProfileServer({
        authEmail,
        authDisplayName,
        authPhotoUrl,
        authEmailVerified,
      });
      set({ profile: profile as ProfileType });
    } catch (error) {
      handleProfileError("fetching or creating profile", error);
    }
  },

  resetProfile: () => {
    set({ profile: defaultProfile });
  },

  updateProfile: async (newProfile: Partial<ProfileType>) => {
    const uid = useAuthStore.getState().uid;
    if (!uid || Object.keys(newProfile).length === 0) return;

    const updatedProfile = { ...get().profile, ...newProfile };

    set({ profile: updatedProfile });

    const runUpdate = async () => {
      try {
        await updateProfileServer(newProfile);
        toast.success("Profile updated successfully");
      } catch (error) {
        toast.error("Failed to update profile. Re-syncing your profile.");
        await get().fetchProfile();
        handleProfileError("updating profile", error);
        throw error;
      }
    };

    const queuedUpdate = profileUpdateQueue.then(runUpdate, runUpdate);
    profileUpdateQueue = queuedUpdate.catch(() => undefined);

    return queuedUpdate;
  },

  deleteAccount: async () => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return;

    try {
      await deleteAccountServer();
    } catch (error) {
      handleProfileError("deleting account", error);
    }
  },
}));

function handleProfileError(action: string, error: unknown): void {
  const errorMessage =
    error instanceof Error ? error.message : "An unknown error occurred";
  console.error(`Error ${action}:`, errorMessage);
}

export default useProfileStore;
