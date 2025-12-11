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
