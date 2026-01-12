"use client";

import { Modal } from "@/components/ui/Modal";
import { usePaywallStore } from "@/zustand/usePaywallStore";
import useProfileStore from "@/zustand/useProfileStore";
import { CREDIT_PACKS, DEFAULT_CREDIT_PACK_ID, formatDollarsFromCents } from "@/constants/creditPacks";
import { ROUTES } from "@/constants/routes";

export function CreditsPaywallModal() {
  const isOpen = usePaywallStore((s) => s.isOpen);
  const context = usePaywallStore((s) => s.context);
  const closePaywall = usePaywallStore((s) => s.closePaywall);
  const credits = useProfileStore((s) => s.profile.credits);

  const required = Number.isFinite(Number(context.requiredCredits))
    ? Math.max(0, Math.floor(Number(context.requiredCredits)))
    : null;
  const current = Number.isFinite(Number(credits)) ? Math.max(0, Math.floor(Number(credits))) : 0;

  const redirectPath = context.redirectPath || ROUTES.account;
  const actionLabel = context.actionLabel || "this action";

  return (
    <Modal isOpen={isOpen} onClose={closePaywall} title="Buy credits to continue" maxWidth="md">
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {required !== null ? (
            <>
              <div>
                <span className="font-semibold text-foreground">{actionLabel}</span> costs{" "}
                <span className="font-semibold text-foreground">{required.toLocaleString()}</span>{" "}
                credits. You have{" "}
                <span className="font-semibold text-foreground">{current.toLocaleString()}</span>.
              </div>
            </>
          ) : (
            <div>
              You don’t have enough credits to continue. Choose a pack below, or switch to API Keys
              mode.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CREDIT_PACKS.map((p) => (
            <a
              key={p.id}
              href={`${ROUTES.paymentAttempt}?pack=${encodeURIComponent(
                p.id
              )}&redirect=${encodeURIComponent(redirectPath)}`}
              onClick={() => closePaywall()}
              className={`rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors p-4 text-left ${
                p.id === DEFAULT_CREDIT_PACK_ID ? "" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-foreground">{p.label}</div>
                {p.badge ? (
                  <div className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {p.badge}
                  </div>
                ) : null}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                ${formatDollarsFromCents(p.amountCents)} · {p.credits.toLocaleString()} credits
              </div>
            </a>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
          <a
            href={ROUTES.account}
            onClick={() => closePaywall()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:opacity-90 transition-opacity"
          >
            Use API keys instead
          </a>
          <a
            href={`${ROUTES.paymentAttempt}?pack=${encodeURIComponent(
              DEFAULT_CREDIT_PACK_ID
            )}&redirect=${encodeURIComponent(redirectPath)}`}
            onClick={() => closePaywall()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Buy credits
          </a>
        </div>
      </div>
    </Modal>
  );
}

