"use client";

import { InlineSpinner } from "./LoadingSpinner";

interface SubmitButtonProps {
  isLoading: boolean;
  disabled: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  type?: "submit" | "button";
  onClick?: () => void;
}

export function SubmitButton({
  isLoading,
  disabled,
  loadingText = "Working",
  children,
  className = "",
  type = "submit",
  onClick,
}: SubmitButtonProps) {
  const baseClasses =
    "w-full py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center";
  const activeClasses = "bg-[#192449] text-white hover:bg-[#263566]";
  const disabledClasses = "bg-gray-200 text-gray-400 cursor-not-allowed";

  return (
    <button
      className={`${baseClasses} ${
        disabled ? disabledClasses : activeClasses
      } ${className}`}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <span>{loadingText}</span>
          <InlineSpinner size="sm" />
        </div>
      ) : (
        children
      )}
    </button>
  );
}
