/**
 * Credits costs for monetization.
 *
 * Notes:
 * - Keep this intentionally simple at first (fixed/word-count based).
 * - If you later move to token-based charging, this file becomes the single
 *   source of truth for cost calculation.
 */
export const CREDITS_COSTS = {
  chatMessage: 25,
  imageGeneration: 300,
  tagSuggestion: 25,
  /**
   * Minimum cost for any text generation (tools/summaries/etc).
   * Chat uses `chatMessage` instead.
   */
  minTextGeneration: 25,
} as const;

/**
 * Word-count based pricing for tools.
 * `wordCount` should already be validated/clamped by the caller.
 */
export function getTextGenerationCreditsCost(wordCount: number): number {
  // Simple starter pricing: ~0.5 credits per requested word, with a floor.
  return Math.max(CREDITS_COSTS.minTextGeneration, Math.ceil(wordCount * 0.5));
}

