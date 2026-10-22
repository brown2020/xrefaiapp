/** Server error code when the image provider refuses a prompt on content-policy grounds. */
export const IMAGE_CONTENT_REJECTED = "IMAGE_CONTENT_REJECTED";
/** Server error code for any other image provider or storage failure. */
export const IMAGE_GENERATION_FAILED = "IMAGE_GENERATION_FAILED";
/** Server error code when a user paying with their own keys has no OpenAI key saved. */
export const IMAGE_MISSING_OPENAI_KEY = "IMAGE_MISSING_OPENAI_KEY";

const CONTENT_POLICY_PATTERN = /moderation|safety system|content policy|content_policy|safety_violations/i;

export function classifyImageProviderError(message: string): string {
  return CONTENT_POLICY_PATTERN.test(message) ? IMAGE_CONTENT_REJECTED : IMAGE_GENERATION_FAILED;
}

/** Inline result message shown under the image tools after a failed generation. */
export function imageFailureMessage(errorCode: string | undefined): string {
  if (errorCode === IMAGE_CONTENT_REJECTED) {
    return "That prompt can't be turned into an image. Please avoid real people and anything against the terms of service, then try again.";
  }
  if (errorCode === IMAGE_MISSING_OPENAI_KEY) {
    return "Images use OpenAI. Add your OpenAI API key in Account, or switch to paying with credits.";
  }
  return "The image couldn't be generated right now. Please try again in a moment.";
}
