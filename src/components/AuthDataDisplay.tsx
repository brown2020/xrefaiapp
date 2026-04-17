"use client";

import { useAuthStore } from "@/zustand/useAuthStore";
import { signOut } from "firebase/auth";
import { deleteCookie } from "cookies-next";
import { auth, storage } from "@/firebase/firebaseClient";
import useProfileStore from "@/zustand/useProfileStore";
import { ChangeEvent, useEffect, useState } from "react";
import { resizeImage } from "@/utils/resizeImage";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import Image from "next/image";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import { getAuthCookieName } from "@/utils/getAuthCookieName";
import toast from "react-hot-toast";

export default function AuthDataDisplay() {
  const uid = useAuthStore((s) => s.uid);
  const authEmail = useAuthStore((s) => s.authEmail);
  const clearAuthDetails = useAuthStore((s) => s.clearAuthDetails);
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [firstName, setFirstName] = useState(profile.firstName ?? "");
  const [lastName, setLastName] = useState(profile.lastName ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
  }, [profile.firstName, profile.lastName]);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;
    if (!uid) {
      toast.error("Please sign in to upload a photo.");
      return;
    }

    setUploading(true);
    try {
      const resizedBlob = await resizeImage(files[0]);
      const storageRef = ref(storage, `users/${uid}/profile.png`);
      const snapshot = await uploadBytesResumable(storageRef, resizedBlob);
      const updatedUrl = await getDownloadURL(snapshot.ref);

      // Persist immediately so the upload isn't orphaned if the user closes
      // the tab before clicking "Save Profile Changes".
      await updateProfile({ photoUrl: updatedUrl });
      toast.success("Photo updated");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Upload failed";
      console.error("Error uploading profile photo:", message);
      toast.error("Could not upload your photo. Please try again.");
    } finally {
      setUploading(false);
      // Allow re-uploading the same file.
      e.target.value = "";
    }
  };

  const hasChanges =
    firstName !== (profile.firstName ?? "") ||
    lastName !== (profile.lastName ?? "");

  const handleSubmit = async () => {
    if (!uid) {
      toast.error("Please sign in to save changes.");
      return;
    }
    if (!hasChanges) return;

    setSaving(true);
    try {
      await updateProfile({ firstName, lastName });
      toast.success("Profile saved");
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const logoutUser = async () => {
    try {
      deleteCookie(getAuthCookieName(), { path: "/" });
      await signOut(auth);
      clearAuthDetails();
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("An error occurred while signing out.");
    }
  };

  return (
    <div className="bg-[#ffffff] border border-[#81878D] rounded-2xl mb-4">
      <div className="flex flex-col p-5 space-y-3">
        <div className="flex flex-col space-y-1">
          <div className="text-base text-[#041D34] font-semibold">
            Login email
          </div>
          <div className="text-[#0B3C68] border-b pb-3 border-[#B8D2FA] text-word">
            {authEmail}
          </div>
        </div>
        <div className="flex flex-col space-y-1">
          <div className="text-base text-[#041D34] font-semibold">User ID</div>
          <div className="text-[#0B3C68] border-b pb-3 border-[#B8D2FA] text-word">
            {uid}
          </div>
        </div>
        <div className="flex flex-col space-y-1">
          <div className="text-base text-[#041D34] mb-1 font-semibold">
            Profile
          </div>
          <div>
            <div className="flex flex-col md:flex-row md:items-start md:space-x-4">
              <div className="shrink-0 mb-4 md:mb-0">
                <div className="relative w-44 aspect-square">
                  {profile.photoUrl ? (
                    <Image
                      width={512}
                      height={512}
                      src={profile.photoUrl}
                      alt="User profile"
                      className="object-cover rounded-md"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-300 rounded-md">
                      <span>Click to upload</span>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-700/50 rounded-md">
                      <LoadingSpinner size="md" />
                    </div>
                  )}

                  <label className="absolute z-10 top-0 left-0 h-full w-full opacity-0 bg-black hover:opacity-50 cursor-pointer">
                    <span className="sr-only">Upload profile photo</span>
                    <input
                      className="opacity-0 h-full w-full cursor-pointer"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              <div className="grow space-y-3">
                <div>
                  <label htmlFor="first-name" className={labelClassName}>
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClassName}
                    placeholder="Enter your First Name"
                  />
                </div>
                <div>
                  <label htmlFor="last-name" className={labelClassName}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClassName}
                    placeholder="Enter your Last Name"
                  />
                </div>
                <div className="w-full sm:flex sm:flex-row flex flex-col gap-2 items-center justify-end mt-5!">
                  <button
                    type="button"
                    disabled={!hasChanges || saving}
                    onClick={handleSubmit}
                    className="w-56 text-white px-3 py-2 custom-write bottom bg-[#192449] opacity-100! hover:bg-[#83A873] rounded-3xl! font-bold transition-transform duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Profile Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={logoutUser}
                    className="w-56 text-white px-3 py-2 custom-write bottom bg-[#192449] opacity-100! hover:bg-[#83A873] rounded-3xl! font-bold transition-transform duration-300 ease-in-out"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
