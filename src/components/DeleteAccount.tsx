"use client";

import { useState, useCallback } from "react";
import DeleteConfirmModal from "./DeleteConfirmModal";
import useProfileStore from "@/zustand/useProfileStore";
import { signOutUser } from "@/hooks/useSignOut";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function DeleteAccount() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const deleteAccount = useProfileStore((state) => state.deleteAccount);
  const router = useRouter();

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const onDeleteConfirm = useCallback(async () => {
    setLoadingDelete(true);
    setShowDeleteModal(false);
    try {
      await deleteAccount();
      await signOutUser();
      toast.success("Account deleted successfully.");
      router.replace(ROUTES.home);
    } catch (error) {
      console.error("Error on deletion of account:", error);
      toast.error("Could not delete your account. Please try again.");
    } finally {
      setLoadingDelete(false);
    }
  }, [deleteAccount, router]);

  return (
    <section
      aria-labelledby="delete-account-heading"
      className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="delete-account-heading" className="text-lg font-bold text-foreground">
          Delete account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently deletes your sign-in, profile, chats, saved history,
          generated images, credits, and payment history. This cannot be undone.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDeleteClick}
        disabled={loadingDelete}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loadingDelete ? "Deleting…" : "Delete account"}
      </button>
      <DeleteConfirmModal
        showDeleteModal={showDeleteModal}
        onHideModal={() => setShowDeleteModal(false)}
        onDeleteConfirm={onDeleteConfirm}
      />
    </section>
  );
}
