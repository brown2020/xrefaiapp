"use client";

import { useAuthStore } from "@/zustand/useAuthStore";
import { storage } from "@/firebase/firebaseClient";
import { useSignOut } from "@/hooks/useSignOut";
import useProfileStore from "@/zustand/useProfileStore";
import { ChangeEvent, useEffect, useState } from "react";
import { resizeImage } from "@/utils/resizeImage";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import Image from "next/image";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  cardClassName,
  inputClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui/FormInput";
import { Camera } from "lucide-react";
import toast from "react-hot-toast";

export default function AuthDataDisplay() {
  const uid = useAuthStore((s) => s.uid);
  const authEmail = useAuthStore((s) => s.authEmail);
  const signOutAndLeave = useSignOut();
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
      // the tab before clicking "Save profile".
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

  const logoutUser = () => void signOutAndLeave();

  return (
    <section aria-labelledby="profile-heading" className={cardClassName}>
      <h2 id="profile-heading" className="text-lg font-bold text-foreground">
        Profile
      </h2>
      <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-start">
        <div className="relative w-36 max-w-full aspect-square shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          {profile.photoUrl ? (
            <Image
              width={512}
              height={512}
              src={profile.photoUrl}
              alt="Your profile photo"
              className="h-full w-full object-cover"
              priority
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
              <Camera size={22} aria-hidden />
              <span>Add photo</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <LoadingSpinner size="md" />
            </div>
          )}
          <label className="absolute inset-0 z-10 cursor-pointer bg-black opacity-0 transition-opacity hover:opacity-30 focus-within:opacity-30 focus-within:outline-2 focus-within:outline-ring">
            <span className="sr-only">Upload profile photo</span>
            <input
              className="h-full w-full cursor-pointer opacity-0"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="min-w-0 grow space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first-name" className={labelClassName}>
                First name
              </label>
              <input
                type="text"
                id="first-name"
                name="given-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="last-name" className={labelClassName}>
                Last name
              </label>
              <input
                type="text"
                id="last-name"
                name="family-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="font-semibold text-foreground">Sign-in email</dt>
              <dd className="mt-0.5 break-all text-muted-foreground">{authEmail}</dd>
            </div>
            <div className="min-w-0">
              <dt className="font-semibold text-foreground">User ID</dt>
              <dd className="mt-0.5 break-all font-mono text-xs leading-5 text-muted-foreground">
                {uid}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={logoutUser}
              className={secondaryButtonClassName}
            >
              Sign out
            </button>
            <button
              type="button"
              disabled={!hasChanges || saving}
              onClick={handleSubmit}
              className={primaryButtonClassName}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
