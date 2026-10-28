/** Firebase ID-token `firebase.sign_in_provider` values this app accepts. */
const ALLOWED_SIGN_IN_PROVIDERS = new Set(["password", "google.com", "emailLink"]);

export function isAllowedSignInProvider(provider: unknown): boolean {
  return typeof provider === "string" && ALLOWED_SIGN_IN_PROVIDERS.has(provider);
}
