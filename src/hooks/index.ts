/**
 * Centralized hook exports
 * Import hooks from @/hooks instead of individual files
 */

// Authentication
export { default as useAuthToken } from "./useAuthToken";

// Firebase data hooks
export { useFirestorePagination } from "./useFirestorePagination";
export { useFirestoreRealtime } from "./useFirestoreRealtime";
export { useChatMessages } from "./useChatMessages";
export { useHistorySaver } from "./useHistorySaver";

// UI & UX hooks
export { useScrollToResult } from "./useScrollToResult";
export { useClientSetup } from "./useClientSetup";

// Generation hooks
export { useGenerationState } from "./useGenerationState";
export { useChatGeneration } from "./useChatGeneration";
export { useImageGeneration } from "./useImageGeneration";

// Utility hooks
export { useWebsiteScraper } from "./useWebsiteScraper";
