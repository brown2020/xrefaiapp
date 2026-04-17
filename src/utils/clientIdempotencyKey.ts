/**
 * Generate a fresh idempotency key for a user-initiated request.
 *
 * Pass this along with each submit so the server can deduplicate genuine
 * retries of the SAME action (network blip, transport retry) while still
 * allowing the user to re-submit the same prompt or re-run the same tool
 * as a distinct request.
 */
export function createClientIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as Crypto).randomUUID === "function"
  ) {
    return (crypto as Crypto).randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
