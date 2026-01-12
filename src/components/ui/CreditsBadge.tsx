"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Coins } from "lucide-react";
import useProfileStore from "@/zustand/useProfileStore";
import { useAuthStore } from "@/zustand/useAuthStore";
import { ROUTES } from "@/constants/routes";
import { DEFAULT_CREDIT_PACK_ID } from "@/constants/creditPacks";

/**
 * Minimal-render credits UI:
 * - Subscribes only to `uid` and `profile.credits`
 * - Re-renders only when the credit number changes
 */
export function CreditsBadge() {
  const uid = useAuthStore((s) => s.uid);
  const credits = useProfileStore((s) => s.profile.credits);
  const pathname = usePathname();

  const LOW_CREDITS_THRESHOLD = 200;

  const creditsLabel = useMemo(() => {
    // Avoid layout-jank from large numbers.
    const safe = typeof credits === "number" ? credits : Number(credits);
    return Math.max(0, Math.round(Number.isFinite(safe) ? safe : 0)).toLocaleString();
  }, [credits]);

  const numericCredits = useMemo(() => {
    const safe = typeof credits === "number" ? credits : Number(credits);
    return Math.max(0, Math.round(Number.isFinite(safe) ? safe : 0));
  }, [credits]);

  const topUpHref = useMemo(() => {
    const redirect = pathname || ROUTES.account;
    return `${ROUTES.paymentAttempt}?pack=${encodeURIComponent(
      DEFAULT_CREDIT_PACK_ID
    )}&redirect=${encodeURIComponent(redirect)}`;
  }, [pathname]);

  if (!uid) return null;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={ROUTES.account}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:opacity-90 transition-opacity"
        aria-label={`Credits balance: ${creditsLabel}. Open account to buy more.`}
        title="Open account / buy credits"
      >
        <Coins className="h-4 w-4 text-muted-foreground" />
        <span className="tabular-nums">{creditsLabel}</span>
        <span className="text-muted-foreground font-medium hidden md:inline">
          credits
        </span>
      </Link>

      {numericCredits > 0 && numericCredits < LOW_CREDITS_THRESHOLD ? (
        <Link
          href={topUpHref}
          className="hidden md:inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          aria-label="Top up credits"
          title="Top up credits"
        >
          Top up
        </Link>
      ) : null}
    </div>
  );
}

