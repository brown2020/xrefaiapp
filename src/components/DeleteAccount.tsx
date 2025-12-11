"use client";

import { useAuthStore } from "@/zustand/useAuthStore";
import { useState, useCallback } from "react";
import DeleteConfirmModal from "./DeleteConfirmModal";
import useProfileStore from "@/zustand/useProfileStore";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function DeleteAccount() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const deleteAccount = useProfileStore((state) => state.deleteAccount);
  const clearAuthDetails = useAuthStore((s) => s.clearAuthDetails);
  const router = useRouter();

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
      router.replace(ROUTES.home);
    } catch (error) {
      setLoadingDelete(false);
      console.error("Error on deletion of account:", error);
    }
  }, [deleteAccount, clearAuthDetails, router]);

  return (
    <div className="flex flex-col container mt-4 mx-auto gap-4">
      <div className="w-full flex justify-end">
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
      </div>
    </div>
  );
}
