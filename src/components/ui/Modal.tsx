"use client";

import { useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showCloseButton?: boolean;
  maxWidth?: "sm" | "md" | "lg";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  maxWidth = "md",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-20000 p-4">
      <div
        ref={modalRef}
        className={`relative bg-card text-card-foreground border border-border p-6 rounded-lg shadow-lg w-full ${maxWidthClasses[maxWidth]} mx-auto`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-0 right-0 p-2 hover:bg-muted bg-muted rounded-full m-2 transition-colors"
            aria-label="Close modal"
          >
            <X size={24} className="text-foreground" />
          </button>
        )}

        {title && (
          <h2
            id="modal-title"
            className="text-2xl font-bold text-center mb-4 pr-8"
          >
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}

// Preset modal for confirmations
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
}: ConfirmModalProps) {
  const confirmClasses =
    confirmVariant === "danger"
      ? "bg-destructive hover:opacity-90 text-destructive-foreground"
      : "bg-primary hover:opacity-90 text-primary-foreground";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      showCloseButton={false}
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-muted hover:opacity-90 text-foreground rounded-lg transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 rounded-lg transition-colors ${confirmClasses}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
