

import { useAuthStore } from "@/zustand/useAuthStore";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "@/firebase/firebaseClient";
import useProfileStore from "@/zustand/useProfileStore";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { resizeImage } from "@/utils/resizeImage";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { doc } from "firebase/firestore";
import Image from "next/image";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import DeleteConfirmModal from "./DeleteConfirmModal";


export default function AuthDataDisplay() {
  const router = useRouter();
  const uid = useAuthStore((s) => s.uid);
  const authEmail = useAuthStore((s) => s.authEmail);
  const clearAuthDetails = useAuthStore((s) => s.clearAuthDetails);
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [newProfile, setNewProfile] = useState(profile);
  const [loading, setLoading] = useState(false);
  const deleteAccount = useProfileStore((state) => state.deleteAccount);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);


  useEffect(() => {
    setNewProfile(profile);
  }, [profile]);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);
      const files = e.target.files;
      if (!files || !files[0]) throw new Error("No file selected");

      const resizedBlob = await resizeImage(files[0]);
      const storageRef = ref(storage, `users/${uid}/profile.png`);
      await uploadBytesResumable(storageRef, resizedBlob);

      if (!storageRef) throw new Error("Error uploading file");

      const updatedUrl = await getDownloadURL(storageRef);
      setNewProfile({ ...newProfile, photoUrl: updatedUrl });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error uploading file: ", error.message);
      } else {
        console.error("An unknown error occurred during file upload.");
      }
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    newProfile.firstName !== profile.firstName ||
    newProfile.lastName !== profile.lastName ||
    newProfile.contactEmail !== profile.contactEmail ||
    newProfile.photoUrl !== profile.photoUrl;

  const handleSubmit = async () => {
    try {
      if (!uid) throw new Error("No user found");
      const userRef = uid ? doc(db, "users", uid) : null;
      if (!userRef) throw new Error("Error saving to Firestore");

      updateProfile({
        firstName: newProfile.firstName || "",
        lastName: newProfile.lastName || "",
        photoUrl: newProfile.photoUrl || "",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error saving to Firestore:", error.message);
      } else {
        console.error("An unknown error occurred while saving to Firestore.");
      }
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      clearAuthDetails();
    } catch (error) {
      console.error("Error signing out:", error);
      alert("An error occurred while signing out.");
    } finally {

    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const onDeleteConfirm = useCallback(async () => {
    setLoadingDelete(true);
    setShowDeleteModal(false);
    try {
      await deleteAccount();
      await signOut(auth);
      clearAuthDetails();
      toast.success("Account deleted successfully.");
      router.replace("/");
    } catch (error) {
      setLoadingDelete(false);
      console.error("Error on deletion of account:", error);
    }
  }, [deleteAccount, clearAuthDetails, router]);

  return (
    <>
      <div className="bg-[#ffffff] border border-[#81878D] rounded-2xl mb-4">
        <div className="flex flex-col p-5 space-y-3">
          <div className="flex flex-col space-y-1">
            <div className="text-base text-[#041D34] font-semibold">Login email</div>
            <div className="text-[#0B3C68] border-b-[1px] pb-3 border-[#B8D2FA] text-word">
              {authEmail}
            </div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="text-base text-[#041D34] font-semibold">User ID</div>
            <div className="text-[#0B3C68] border-b-[1px] pb-3 border-[#B8D2FA] text-word">
              {uid}
            </div>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="text-base text-[#041D34] mb-1 font-semibold">Profile</div>
            <div className="">
              <div className="flex flex-col md:flex-row md:items-start md:space-x-4">
                {/* <!-- Profile Image --> */}
                <div className="flex-shrink-0 mb-4 md:mb-0">
                  <div className="relative w-44	aspect-square ">
                    {newProfile.photoUrl && (
                      <Image
                        width={512}
                        height={512}
                        src={newProfile.photoUrl}
                        alt="User"
                        className="object-cover rounded-md "
                        priority={true}
                      />
                    )}
                    {!newProfile.photoUrl && (
                      <div className="flex h-full items-center justify-center bg-gray-300 rounded-md">
                        <span>Click to upload</span>
                      </div>
                    )}
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50 rounded-md">
                        <ClipLoader color="#4A90E2" />
                      </div>
                    )}

                    <div className="absolute z-10 top-0 left-0 h-full w-full opacity-0 bg-black hover:opacity-50 cursor-pointer">
                      <input
                        className="opacity-0 h-full w-full cursor-pointer"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />
                    </div>
                  </div>
                </div>
                {/* <!-- Form Inputs --> */}
                <div className="flex-grow space-y-3">
                  <div>
                    <label className="text-base text-[#041D34] mb-1 font-semibold">First Name</label>
                    <input
                      type="text"
                      id="first-name"
                      value={newProfile.firstName}
                      onChange={(e) =>
                        setNewProfile({ ...newProfile, firstName: e.target.value })
                      }
                      className="mt-2 w-full border border-[#ECECEC] bg-[#F5F5F5] text-[#0B3C68] rounded-md px-3 py-3 placeholder:text-[#BBBEC9]"
                      placeholder="Enter your First Name"
                    />
                  </div>
                  <div>
                    <label className="text-base text-[#041D34] mb-1 font-semibold">Last Name</label>
                    <input
                      type="text"
                      id="last-name"
                      value={newProfile.lastName}
                      onChange={(e) =>
                        setNewProfile({ ...newProfile, lastName: e.target.value })
                      }
                      className="mt-2 w-full border border-[#ECECEC] bg-[#F5F5F5] text-[#0B3C68] rounded-md px-3 py-3 placeholder:text-[#BBBEC9]"
                      placeholder="Enter your Last Name"
                    />
                  </div>
                  {/* <div>
                    <label className="text-base text-[#041D34] mb-1 font-semibold">Contact Email</label>
                    <input
                      type="email"
                      id="contact-email"
                      value={newProfile.contactEmail}
                      onChange={(e) =>
                        setNewProfile({ ...newProfile, contactEmail: e.target.value })
                      }
                      className="mt-2 w-full border border-[#ECECEC] bg-[#F5F5F5] text-[#0B3C68] rounded-md px-3 py-3 placeholder:text-[#BBBEC9]"
                      placeholder="Enter your Email"
                    />
                  </div> */}
                  {/* <!-- Save Button --> */}
                  <div className="w-full sm:flex sm:flex-row flex flex-col gap-2 items-center justify-between !mt-5">
                    <button
                      type="button"
                      disabled={!hasChanges}
                      onClick={handleSubmit}
                      className="w-56 text-white px-3 py-2 custom-write bottom bg-[#192449] !opacity-100 hover:bg-[#83A873] !rounded-3xl font-bold transition-transform duration-300 ease-in-out">
                      Save Profile Changes
                    </button>
                    <div className="!mt-0  credits-block sm:flex sm:flex-row flex flex-col justify-center items-center gap-2">
                      <button
                        onClick={handleDeleteClick}
                        className="font-bold bg-[#FF5356] hover:bg-[#c0373a] rounded-3xl text-white w-56 block px-3 py-2"
                      >
                        
                        {loadingDelete ? "Deleting..." : "Delete Account"}
                      </button>
                      <DeleteConfirmModal
                        showDeleteModal={showDeleteModal}
                        onHideModal={() => setShowDeleteModal(false)}
                        onDeleteConfirm={onDeleteConfirm}
                      />
                      <button
                        onClick={logoutUser}
                        className="w-56 text-white px-3 py-2 custom-write bottom bg-[#192449] !opacity-100 hover:bg-[#83A873] !rounded-3xl font-bold transition-transform duration-300 ease-in-out"
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
      </div>
    </>
  );
}
