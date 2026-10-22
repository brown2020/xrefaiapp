"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";
import {
  AI_CONSENT_PROVIDERS,
  AI_CONSENT_VERSION,
  isAiConsentExemptPath,
} from "@/constants/aiConsent";
import { ROUTES } from "@/constants/routes";
import { useSignOut } from "@/hooks/useSignOut";
import { useAuthStore } from "@/zustand/useAuthStore";
import useProfileStore from "@/zustand/useProfileStore";

/**
 * One-time permission screen shown before a signed-in user's content can be
 * sent to third-party AI providers. Declining signs the user out.
 */
export function AiConsentModal() {
  const pathname = usePathname();
  const uid = useAuthStore((s) => s.uid);
  const profileLoaded = useProfileStore((s) => s.profileLoaded);
  const consentVersion = useProfileStore((s) => s.profile.aiConsentVersion);
  const recordAiConsent = useProfileStore((s) => s.recordAiConsent);
  const signOut = useSignOut();
  const [isBusy, setIsBusy] = useState(false);

  const isOpen =
    Boolean(uid) &&
    profileLoaded &&
    consentVersion !== AI_CONSENT_VERSION &&
    !isAiConsentExemptPath(pathname);

  const handleAgree = async () => {
    setIsBusy(true);
    try {
      await recordAiConsent(AI_CONSENT_VERSION);
    } catch (error) {
      console.error("Error recording AI consent:", error);
      toast.error("Couldn't save your choice. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDecline = async () => {
    setIsBusy(true);
    await signOut();
    setIsBusy(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => undefined}
      showCloseButton={false}
      title="Allow AI processing?"
      maxWidth="md"
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Xref.ai sends what you type, paste, or link (your prompts, chat
          messages, text to summarize, and web pages you ask about) to these AI
          companies to generate your answers and images:
        </p>
        <ul className="space-y-2">
          {AI_CONSENT_PROVIDERS.map((provider) => (
            <li key={provider.name} className="rounded-lg border border-border px-3 py-2">
              <span className="font-semibold text-foreground">{provider.name}</span>
              {" · "}
              {provider.use}
            </li>
          ))}
        </ul>
        <p>
          We share it only to produce your results. Read the{" "}
          <Link href={ROUTES.privacy} className="font-medium text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          for details. Without this permission you can&rsquo;t use Xref.ai&rsquo;s
          AI tools.
        </p>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleDecline}
            disabled={isBusy}
            className="rounded-lg border border-border bg-card px-4 py-2 font-medium text-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Don&rsquo;t allow and sign out
          </button>
          <button
            type="button"
            onClick={handleAgree}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isBusy && <InlineSpinner size="sm" />}
            Allow and continue
          </button>
        </div>
      </div>
    </Modal>
  );
}
