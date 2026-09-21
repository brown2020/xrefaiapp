/**
 * A missing profile document receives the starter balance only once.
 * After the claim exists, recreating the profile does not grant credits again.
 */
export function creditsForNewProfile(
  starterGrantAlreadyClaimed: boolean,
  initialCredits: number
): number {
  return starterGrantAlreadyClaimed ? 0 : initialCredits;
}
