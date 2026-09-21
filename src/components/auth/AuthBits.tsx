"use client";

import { AlertCircle } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import type { AuthFeedback } from "@/components/auth/useAuthSession";

export function AuthFeedbackMessage({
  feedback,
}: {
  feedback: Exclude<AuthFeedback, null>;
}) {
  const toneClasses = {
    error: "border-red-200 bg-red-50 text-red-950",
    info: "border-blue-200 bg-blue-50 text-blue-950",
    success: "border-green-200 bg-green-50 text-green-950",
  };

  const iconClasses = {
    error: "text-red-600",
    info: "text-blue-600",
    success: "text-green-700",
  };

  return (
    <div
      role={feedback.tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium leading-5 ${toneClasses[feedback.tone]}`}
    >
      <AlertCircle
        className={`mt-0.5 h-5 w-5 shrink-0 ${iconClasses[feedback.tone]}`}
        aria-hidden="true"
      />
      <span>{feedback.message}</span>
    </div>
  );
}

export function AuthButton({
  label,
  logo,
  onClick,
}: {
  label: string;
  logo: StaticImageData;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="grid min-h-12 w-full grid-cols-[24px_1fr_24px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 font-semibold text-foreground transition-colors hover:bg-muted focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30"
      onClick={onClick}
    >
      <div className="w-6 h-6 relative">
        <Image
          src={logo}
          alt={`${label} logo`}
          className="object-contain"
          fill
          sizes="24px"
        />
      </div>
      <span className="text-center">{label}</span>
      <span aria-hidden="true" />
    </button>
  );
}
