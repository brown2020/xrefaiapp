/**
 * Application-wide constants
 */

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

// ============================================================================
// Streaming & Response Constants
// ============================================================================

/** Maximum characters allowed in a streamed response before truncation */
export const MAX_STREAMED_CHARS = 12000;

/** Notice appended when a response is truncated */
export const TRUNCATION_NOTICE = "\n\n[Response truncated due to length]";

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
// Payment & Lock Constants
// ============================================================================

/** TTL for payment processing locks (30 seconds in milliseconds) */
export const PAYMENT_LOCK_TTL_MS = 30_000;
