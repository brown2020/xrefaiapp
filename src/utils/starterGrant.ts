export type StarterClaimState = "missing" | "pending" | "granted";

/**
 * Credits to add for the one-time starter balance.
 * Spec: a new server-created profile defaults to that balance.
 * A legacy profile that already exists without a claim is sealed and not paid again.
 * A pending claim (created at zero) is paid on the next fetch.
 */
export function starterCreditsToAdd(input: {
  profileExists: boolean;
  claimState: StarterClaimState;
  initialCredits: number;
}): number {
  if (input.claimState === "granted") return 0;
  if (input.profileExists && input.claimState === "missing") return 0;
  if (!Number.isFinite(input.initialCredits)) return 0;
  return Math.max(0, Math.floor(input.initialCredits));
}

/**
 * A missing profile receives the starter balance once. Email verification does
 * not gate it; `spec.md` says new profiles default to this balance.
 */
export function creditsForNewProfile(
  starterGrantAlreadyClaimed: boolean,
  initialCredits: number
): number {
  return starterCreditsToAdd({
    profileExists: false,
    claimState: starterGrantAlreadyClaimed ? "granted" : "missing",
    initialCredits,
  });
}
