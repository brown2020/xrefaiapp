export type StarterClaimState = "missing" | "pending" | "granted";

/**
 * Credits to add for the one-time starter balance.
 * A legacy profile that already exists without a claim is sealed and not paid again.
 * An unverified email stays at zero until the token says the address is verified.
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
 * A missing profile receives the starter balance only once, and only after the
 * ID token says the email is verified.
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
