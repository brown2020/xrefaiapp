/**
 * Shared credit utilities for consistent handling across client and server.
 *
 * Invariants:
 * - Credits are always stored as non-negative integers.
 * - `coerceCredits` always returns a finite integer (floored).
 * - Server-side credit mutations must round the resulting balance.
 */

/**
 * Safely coerces a value to a non-negative finite integer, returning fallback
 * (also coerced to a non-negative integer) if invalid.
 *
 * @example
 * coerceCredits(100, 0) // 100
 * coerceCredits("50.7", 0) // 50
 * coerceCredits(undefined, 1000) // 1000
 * coerceCredits(Infinity, 0) // 0
 * coerceCredits(-5, 0) // 0
 */
export function coerceCredits(value: unknown, fallback: number): number {
  const safeFallback = Number.isFinite(fallback)
    ? Math.max(0, Math.floor(fallback))
    : 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return safeFallback;
}

/**
 * Validates that a credit amount is valid for debiting.
 */
export function isValidDebitAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

/**
 * Validates that a credit amount is valid for crediting.
 */
export function isValidCreditAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

/**
 * Calculates a new balance after a credit operation, rounding to an integer.
 * Throws if the result would be invalid (negative for debit, non-finite).
 */
export function calculateNewBalance(currentBalance: number, delta: number): number {
  const newBalance = currentBalance + delta;

  if (!Number.isFinite(newBalance)) {
    throw new Error("Invalid credits value - result is not finite");
  }

  const rounded = Math.floor(newBalance);
  if (rounded < 0) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  return rounded;
}

/**
 * Formats credits for display (e.g., "1,000 credits").
 */
export function formatCredits(credits: number): string {
  const safeCredits = coerceCredits(credits, 0);
  return `${safeCredits.toLocaleString()} credit${safeCredits === 1 ? "" : "s"}`;
}
