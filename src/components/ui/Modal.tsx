"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef, ReactNode } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseEvent = useEffectEvent(() => {
    onClose();
  });

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCloseEvent();
    };
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) onCloseEvent();
    };
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("click", handleBackdropClick);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("click", handleBackdropClick);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-visible border-0 bg-transparent p-0 backdrop:bg-black/60"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className={`relative bg-card text-card-foreground border border-border p-6 rounded-lg shadow-lg w-full ${maxWidthClasses[maxWidth]} max-h-[calc(100dvh-2rem)] overflow-y-auto mx-auto`}
      >
        {showCloseButton && (
          <button
            type="button"
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
    </dialog>
  );

  if (typeof document === "undefined") return modalContent;
  return createPortal(modalContent, document.body);
}

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
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-muted hover:opacity-90 text-foreground rounded-lg transition-colors"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`px-4 py-2 rounded-lg transition-colors ${confirmClasses}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
