"use client";

import Link from "next/link";
import { UNVERIFIED_STARTER_CREDITS_MESSAGE } from "@/utils/starterCreditsMessage";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Coins } from "lucide-react";
import useProfileStore from "@/zustand/useProfileStore";
import { useAuthStore } from "@/zustand/useAuthStore";
import { ROUTES } from "@/constants/routes";
import { DEFAULT_CREDIT_PACK_ID } from "@/constants/creditPacks";
import { useShowWebOnly } from "@/hooks/useShowWebOnly";

/**
 * Credits balance, plus a verify-email prompt while the account is unverified.
 */
export function CreditsBadge({ showLabel = false }: { showLabel?: boolean }) {
  const uid = useAuthStore((s) => s.uid);
  const credits = useProfileStore((s) => s.profile.credits);
  const emailVerified = useProfileStore((s) => s.profile.emailVerified);
  const profileLoaded = useProfileStore((s) => s.profileLoaded);
  const pathname = usePathname();
  const canBuyCredits = useShowWebOnly();

  const LOW_CREDITS_THRESHOLD = 200;

  const numericCredits = useMemo(() => {
    const safe = typeof credits === "number" ? credits : Number(credits);
    return Math.max(0, Math.round(Number.isFinite(safe) ? safe : 0));
  }, [credits]);

  const creditsLabel = numericCredits.toLocaleString();

  const topUpHref = useMemo(() => {
    const redirect = pathname || ROUTES.account;
    return `${ROUTES.paymentAttempt}?pack=${encodeURIComponent(
      DEFAULT_CREDIT_PACK_ID
    )}&redirect=${encodeURIComponent(redirect)}`;
  }, [pathname]);

  if (!uid) return null;

  const balanceLabel = profileLoaded
    ? `Credits balance: ${creditsLabel} credits. ${canBuyCredits ? "Open account to buy more." : "Open account."}`
    : "Credits balance loading";

  return (
    <div className="flex items-center gap-2">
      <Link
        href={ROUTES.account}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:opacity-90 transition-opacity"
        aria-label={balanceLabel}
        title={canBuyCredits ? "Open account / buy credits" : "Open account"}
      >
        <Coins className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="tabular-nums">{profileLoaded ? creditsLabel : "…"}</span>{" "}
        <span
          className={`text-muted-foreground font-medium ${showLabel ? "" : "hidden md:inline"}`}
        >
          credits
        </span>
      </Link>

      {profileLoaded && !emailVerified ? (
        <Link
          href={ROUTES.account}
          className="hidden md:inline-flex max-w-56 items-center rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-foreground hover:opacity-90"
          title={UNVERIFIED_STARTER_CREDITS_MESSAGE}
        >
          Verify email for 1,000 credits
        </Link>
      ) : null}

      {canBuyCredits && profileLoaded && emailVerified && numericCredits > 0 && numericCredits < LOW_CREDITS_THRESHOLD ? (
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

