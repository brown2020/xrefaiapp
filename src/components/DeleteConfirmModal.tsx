"use client";

import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/Modal";

type Props = {
  showDeleteModal: boolean;
  onHideModal: () => void;
  onDeleteConfirm: () => void;
};

export default function DeleteConfirmModal({
  showDeleteModal,
  onHideModal,
  onDeleteConfirm,
}: Props) {
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [error, setError] = useState<string>("");

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmation === "DELETE ACCOUNT") {
      onDeleteConfirm();
    } else {
      setError("Please type DELETE ACCOUNT exactly to confirm.");
    }
  }, [deleteConfirmation, onDeleteConfirm]);

  const errorId = error ? "delete-confirmation-error" : undefined;

  return (
    <Modal
      isOpen={showDeleteModal}
      onClose={onHideModal}
      maxWidth="sm"
      title="Delete account"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          This action is permanent. Please type{" "}
          <span className="font-semibold text-gray-900">DELETE ACCOUNT</span> to
          confirm.
        </p>

        <div>
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(e) => {
              setDeleteConfirmation(e.target.value);
              if (error) setError("");
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            placeholder="Type DELETE ACCOUNT"
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            autoFocus
          />
          {error && (
            <p id={errorId} className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onHideModal}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Delete account
          </button>
        </div>
      </div>
    </Modal>
  );
}
