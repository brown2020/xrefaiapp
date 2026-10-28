/**
 * Shared client error helpers.
 */

/**
 * Thrown on the client when a text generation stream finishes with no text
 * (for example a content filter). The server refunds that request.
 */
export class EmptyCompletionError extends Error {
  constructor() {
    super("EMPTY_COMPLETION");
    this.name = "EmptyCompletionError";
  }
}

/**
 * User-facing message for an empty completion.
 */
export function emptyCompletionMessage(useCredits: boolean | undefined): string {
  return useCredits === false
    ? "The model returned no text. Try rephrasing your request."
    : "The model returned no text, so you were not charged. Try rephrasing your request.";
}

/**
 * Checks if an error is an insufficient credits error.
 */
export function isInsufficientCreditsError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("statusCode" in error && error.statusCode === 402) return true;
  if (!("message" in error)) return false;
  const raw = error.message;
  if (typeof raw !== "string") return false;
  const message = raw.toLowerCase();
  return (
    raw === "INSUFFICIENT_CREDITS" ||
    message.includes("insufficient") ||
    message.includes("not enough credits")
  );
}
