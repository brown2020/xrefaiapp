/**
 * Shared error handling utilities for consistent error management across the app.
 */

import toast from "react-hot-toast";

/**
 * Custom error class for insufficient credits scenarios.
 */
export class InsufficientCreditsError extends Error {
  constructor(message: string = "INSUFFICIENT_CREDITS") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Custom error class for authentication required scenarios.
 */
export class AuthRequiredError extends Error {
  constructor(message: string = "AUTH_REQUIRED") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

/**
 * Custom error class for rate limit exceeded scenarios.
 */
export class RateLimitError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number = 60000) {
    super("RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Type guard to check if an error has a message property.
 *
 * @param error - The error to check
 * @returns True if error is an Error with a message
 */
export function isErrorWithMessage(error: unknown): error is Error {
  return (
    error instanceof Error ||
    (typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string")
  );
}

/**
 * Checks if an error is an insufficient credits error.
 *
 * @param error - The error to check
 * @returns True if this is an insufficient credits error
 */
export function isInsufficientCreditsError(error: unknown): boolean {
  if (error instanceof InsufficientCreditsError) {
    return true;
  }

  if (isErrorWithMessage(error)) {
    const message = error.message.toLowerCase();
    return (
      error.message === "INSUFFICIENT_CREDITS" ||
      message.includes("insufficient") ||
      message.includes("not enough credits")
    );
  }

  return false;
}

/**
 * Checks if an error is an authentication required error.
 *
 * @param error - The error to check
 * @returns True if this is an auth required error
 */
export function isAuthRequiredError(error: unknown): boolean {
  if (error instanceof AuthRequiredError) {
    return true;
  }

  if (isErrorWithMessage(error)) {
    return error.message === "AUTH_REQUIRED";
  }

  return false;
}

/**
 * Checks if an error is a rate limit error.
 *
 * @param error - The error to check
 * @returns True if this is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }

  if (isErrorWithMessage(error)) {
    const message = error.message.toLowerCase();
    return (
      error.message === "RATE_LIMIT_EXCEEDED" ||
      message.includes("rate limit") ||
      message.includes("too many requests")
    );
  }

  return false;
}

/**
 * Gets a safe error message from an unknown error.
 *
 * @param error - The error to extract message from
 * @param fallback - Fallback message if extraction fails
 * @returns The error message
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = "An unexpected error occurred"
): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}

/**
 * Context for paywall opening
 */
export interface PaywallContext {
  actionLabel: string;
  requiredCredits: number;
  redirectPath: string;
}

/**
 * Handles insufficient credits errors with toast and paywall.
 * This is a client-side utility that integrates with the paywall store.
 *
 * @param openPaywall - Function to open the paywall modal
 * @param context - Context for the paywall
 */
export function handleInsufficientCredits(
  openPaywall: (context: PaywallContext) => void,
  context: PaywallContext
): void {
  toast.error("Not enough credits. Please buy more credits in Account.");
  openPaywall(context);
}

/**
 * Standard error handler for API operations.
 * Logs the error and shows a toast notification.
 *
 * @param operation - Description of the operation that failed
 * @param error - The error that occurred
 * @param showToast - Whether to show a toast notification (default: true)
 */
export function handleOperationError(
  operation: string,
  error: unknown,
  showToast: boolean = true
): void {
  const message = getErrorMessage(error);
  console.error(`Error ${operation}:`, message);

  if (showToast) {
    // Don't show toast for known handled errors
    if (!isInsufficientCreditsError(error) && !isAuthRequiredError(error)) {
      toast.error(`Failed to ${operation}. Please try again.`);
    }
  }
}
