/**
 * Shared credit utilities for consistent handling across client and server.
 */

/**
 * Safely coerces a value to a number, returning fallback if invalid.
 * Used to handle potentially malformed credit values from Firestore or user input.
 *
 * @param value - The value to coerce (can be number, string, or unknown)
 * @param fallback - The fallback value if coercion fails
 * @returns A finite number
 *
 * @example
 * coerceCredits(100, 0) // returns 100
 * coerceCredits("50", 0) // returns 50
 * coerceCredits(undefined, 1000) // returns 1000
 * coerceCredits(Infinity, 0) // returns 0
 */
export function coerceCredits(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Calculates the new balance after a credit operation.
 * Throws if the result would be invalid (negative for debit, non-finite).
 *
 * @param currentBalance - The current credit balance
 * @param delta - The change in credits (negative for debit, positive for credit)
 * @returns The new balance
 * @throws Error if the operation would result in an invalid balance
 */
export function calculateNewBalance(currentBalance: number, delta: number): number {
  const newBalance = currentBalance + delta;

  if (!Number.isFinite(newBalance)) {
    throw new Error("Invalid credits value - result is not finite");
  }

  if (newBalance < 0) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  return newBalance;
}

/**
 * Formats credits for display (e.g., "1,000 credits")
 *
 * @param credits - The number of credits
 * @returns Formatted string
 */
export function formatCredits(credits: number): string {
  const safeCredits = coerceCredits(credits, 0);
  return `${safeCredits.toLocaleString()} credit${safeCredits === 1 ? "" : "s"}`;
}
