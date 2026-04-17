/**
 * Application-wide constants
 */

// Re-export route configuration
export {
  ROUTES,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  FOOTER_HIDDEN_ROUTES,
  NAV_MENU_ITEMS,
  FOOTER_MENU_ITEMS,
} from "./routes";

// Chat and conversation limits
export const MAX_WORDS_IN_CONTEXT = 5000;
export const MAX_CHAT_LOAD = 30;
export const MAX_HISTORY_LOAD = 20;

// Word count limits for AI generation
export const MIN_WORD_COUNT = 3;
export const MAX_WORD_COUNT = 800;
export const DEFAULT_WORD_COUNT = 30;

// UI timing constants (in milliseconds)
export const COPY_FEEDBACK_DURATION = 2000;
export const DEBOUNCE_DELAY = 100;

// Grade levels for text simplification
export const GRADE_LEVELS = [
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "High School",
  "College",
  "PhD",
];

// Common error messages
export const ERROR_MESSAGES = {
  serverOverloaded:
    "No suggestions found. Servers might be overloaded right now.",
  imageGeneration:
    "I can't do that. I can't do real people or anything that violates the terms of service. Please try changing the prompt.",
  genericError: "An error occurred. Please try again.",
  insufficientCredits: "Not enough credits. Please buy more credits in Account.",
  authRequired: "Please sign in to continue.",
  rateLimited: "Too many requests. Please wait a moment and try again.",
} as const;

// ============================================================================
// Streaming & Response Constants
// ============================================================================

/** Maximum characters allowed in a streamed response before truncation */
export const MAX_STREAMED_CHARS = 12000;

/** Notice appended when a response is truncated */
export const TRUNCATION_NOTICE = "\n\n[Response truncated due to length]";

/** Throttle interval for streaming UI updates (milliseconds) */
export const STREAMING_THROTTLE_MS = 100;

/** Minimum interval between streaming state updates (milliseconds) */
export const STREAMING_UPDATE_INTERVAL_MS = 120;

// ============================================================================
// Markdown Rendering Limits
// ============================================================================

/** Max characters before we skip markdown parsing and render as plain text */
export const MAX_MARKDOWN_CHARS = 8000;

/** Max line count before we skip markdown parsing */
export const MAX_MARKDOWN_LINES = 400;

/** Max list-item markers before we skip markdown parsing */
export const MAX_MARKDOWN_MARKERS = 300;

// ============================================================================
// UI Display Limits
// ============================================================================

/** Maximum number of chat messages to display at once */
export const MAX_VISIBLE_CHATS = 80;

// ============================================================================
// Authentication & Token Constants
// ============================================================================

/** Interval for refreshing auth tokens (50 minutes in milliseconds) */
export const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

/** Timeout for waiting for profile sync (milliseconds) */
export const PROFILE_SYNC_TIMEOUT_MS = 5000;

// ============================================================================
// Rate Limiting Constants
// ============================================================================

/** Default rate limit window (1 minute in milliseconds) */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Default requests per window for chat endpoint */
export const CHAT_RATE_LIMIT = 60;

/** Default requests per window for image generation endpoint */
export const IMAGE_RATE_LIMIT = 10;

/** Default requests per window for tools endpoint */
export const TOOLS_RATE_LIMIT = 30;

// ============================================================================
// Idempotency Constants
// ============================================================================

/** TTL for idempotency keys (24 hours in milliseconds) */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Time window for generating idempotency keys (1 minute) */
export const IDEMPOTENCY_TIME_WINDOW_MS = 60_000;

// ============================================================================
// Payment & Lock Constants
// ============================================================================

/** TTL for payment processing locks (30 seconds in milliseconds) */
export const PAYMENT_LOCK_TTL_MS = 30_000;
