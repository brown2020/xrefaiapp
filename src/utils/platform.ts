// utils/platform.ts
export function isIOSReactNativeWebView(): boolean {
  if (typeof window === "undefined") {
    return false; // Ensure this is only run client-side
  }

  // Check if we are in a React Native WebView
  const isReactNativeWebView = typeof window.ReactNativeWebView !== "undefined";

  // Return trueif in a React Native WebView
  return isReactNativeWebView;
}

const restrictedWordsPatterns = [
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
  /\bvagina\b/i,
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
  /n[@a]ked/i,
  /p[0o]rn/i,
  /s[e3]x/i,
  /er[o0]tic/i,
  /n[i1]pple/i,
];

export const checkRestrictedWords = (imagePrompt: string): boolean => {
  return restrictedWordsPatterns.some((pattern) => pattern.test(imagePrompt));
};
