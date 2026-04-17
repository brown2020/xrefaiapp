"use client";

import toast from "react-hot-toast";
import { checkRestrictedWords, isIOSReactNativeWebView } from "./platform";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates content for restricted words in iOS WebView environment.
 *
 * NOTE: This is a UX-only filter running on the client in a narrow context
 * (iOS WebView). The server does NOT re-apply this list. If broader
 * moderation is needed in the future, move it to the server side.
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
 * Returns true if content is valid, false otherwise.
 */
export function validateContentWithToast(content: string): boolean {
  const result = validateContent(content);
  if (!result.valid && result.error) {
    toast.error(result.error);
    return false;
  }
  return true;
}
