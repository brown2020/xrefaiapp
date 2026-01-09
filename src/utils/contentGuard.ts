import toast from "react-hot-toast";
import { checkRestrictedWords, isIOSReactNativeWebView } from "./platform";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates content for restricted words in iOS WebView environment
 * @param content - The content to validate
 * @returns Validation result with error message if invalid
 */
export function validateContent(content: string): ValidationResult {
  if (isIOSReactNativeWebView() && checkRestrictedWords(content)) {
    return {
      valid: false,
      error: "Your description contains restricted words and cannot be used.",
    };
  }
  return { valid: true };
}

/**
 * Validates content and shows non-blocking feedback if invalid.
 * Returns true if content is valid, false otherwise
 * @param content - The content to validate
 * @returns boolean indicating if content is valid
 */
export function validateContentWithToast(content: string): boolean {
  const result = validateContent(content);
  if (!result.valid && result.error) {
    toast.error(result.error);
    return false;
  }
  return true;
}

/**
 * Backwards-compatible alias (kept to avoid churn).
 * Prefer `validateContentWithToast`.
 */
export function validateContentWithAlert(content: string): boolean {
  return validateContentWithToast(content);
}
