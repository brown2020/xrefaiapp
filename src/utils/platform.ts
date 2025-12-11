/**
 * Platform detection utilities
 */

const isBrowser = () => typeof window !== "undefined";

/**
 * Check if running in a React Native WebView
 */
export function isReactNativeWebView(): boolean {
  if (!isBrowser()) return false;
  return typeof window.ReactNativeWebView !== "undefined";
}

/**
 * Check if running in iOS React Native WebView
 * @deprecated Use isReactNativeWebView() - the naming was misleading
 */
export function isIOSReactNativeWebView(): boolean {
  return isReactNativeWebView();
}

/**
 * Restricted word patterns for content moderation
 * Used to prevent inappropriate content in image generation
 */
const RESTRICTED_WORD_PATTERNS: RegExp[] = [
  /\bnude\b/i,
  /\bnaked\b/i,
  /\bsexual\b/i,
  /\bexplicit\b/i,
  /\bporn\b/i,
  /\berotic\b/i,
  /\bprovocative\b/i,
  /\bseductive\b/i,
  /\bintimate\b/i,
  /\blingerie\b/i,
  /\bunderwear\b/i,
  /\bbikini\b/i,
  /\bstrip\b/i,
  /\bsex\b/i,
  /\bbreasts?\b/i,
  /\bgenital\b/i,
  /\bvagina\b/i,
  /\bpenis\b/i,
  /\bbuttocks?\b/i,
  /\bbare\b/i,
  /\binappropriate\b/i,
  /\bobscene\b/i,
  /\blewd\b/i,
  /\bkinky\b/i,
  /\bfetish\b/i,
  /\baroused\b/i,
  /\bsensual\b/i,
  /\borgasm\b/i,
  /\bmasturbate\b/i,
  /\badult\b/i,
  /\bhardcore\b/i,
  /\bsoftcore\b/i,
  /\bplayboy\b/i,
  /\bxxx\b/i,
  /\bnsfw\b/i,
  /\bpornographic\b/i,
  /\blust\b/i,
  /\bprovocation\b/i,
  /\bscantily\b/i,
  /\bsuggestive\b/i,
  /\bcamgirl\b/i,
  /\bwebcam\b/i,
  /\bescort\b/i,
  /\bprostitute\b/i,
  /\bhooker\b/i,
  /\bbrothel\b/i,
  /\blapdance\b/i,
  /\bstripper\b/i,
  /\bnipple\b/i,
  /\bthong\b/i,
  /\blatex\b/i,
  /\bbdsm\b/i,
  /\bbondage\b/i,
  // Leetspeak variants
  /n[@a]ked/i,
  /p[0o]rn/i,
  /s[e3]x/i,
  /er[o0]tic/i,
  /n[i1]pple/i,
];

/**
 * Check if content contains restricted words
 * @param content - The text content to check
 * @returns true if restricted content is found
 */
export function checkRestrictedWords(content: string): boolean {
  return RESTRICTED_WORD_PATTERNS.some((pattern) => pattern.test(content));
}
