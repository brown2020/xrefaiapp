"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/utils/clipboard";
import { COPY_FEEDBACK_DURATION } from "@/constants";

interface CopyButtonProps {
  text: string;
  successMessage?: string;
  className?: string;
  size?: number;
  showLabel?: boolean;
  label?: string;
  copiedLabel?: string;
}

export function CopyButton({
  text,
  successMessage = "Copied to clipboard",
  className = "",
  size = 14,
  showLabel = true,
  label = "Copy",
  copiedLabel = "Copied",
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(text, successMessage);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), COPY_FEEDBACK_DURATION);
    }
  }, [text, successMessage]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 transition-colors cursor-pointer ${className}`}
    >
      {isCopied ? (
        <>
          <Check size={size} className="text-green-600" />
          {showLabel && <span className="text-green-600">{copiedLabel}</span>}
        </>
      ) : (
        <>
          <Copy size={size} />
          {showLabel && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
