export type StarterClaimState = "missing" | "pending" | "granted";

/**
 * Credits to add for the one-time starter balance.
 * Only a verified ID token (`email_verified`) is paid. Google counts when
 * that claim is true. A legacy profile with no claim is sealed and not paid.
 * A pending claim is paid once on a later verified sign-in.
 */
export function starterCreditsToAdd(input: {
  profileExists: boolean;
  claimState: StarterClaimState;
  emailVerified: boolean;
  initialCredits: number;
}): number {
  if (input.claimState === "granted") return 0;
  if (input.profileExists && input.claimState === "missing") return 0;
  if (!input.emailVerified) return 0;
  if (!Number.isFinite(input.initialCredits)) return 0;
  return Math.max(0, Math.floor(input.initialCredits));
}

/**
 * A missing profile receives the starter balance once, and only when the
 * server-verified ID token says the email is verified.
 */
export function creditsForNewProfile(
  starterGrantAlreadyClaimed: boolean,
  emailVerified: boolean,
  initialCredits: number
): number {
  return starterCreditsToAdd({
    profileExists: false,
    claimState: starterGrantAlreadyClaimed ? "granted" : "missing",
    emailVerified,
    initialCredits,
  });
}
