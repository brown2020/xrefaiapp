type ProviderKeyFields = {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  xaiApiKey?: string;
  googleApiKey?: string;
};

/**
 * Credits mode uses server provider keys. The browser must not send the
 * profile's own keys on those requests.
 */
export function providerKeysForRequest(
  useCredits: boolean,
  keys: ProviderKeyFields
): ProviderKeyFields {
  if (useCredits) return {};
  return {
    openaiApiKey: keys.openaiApiKey,
    anthropicApiKey: keys.anthropicApiKey,
    xaiApiKey: keys.xaiApiKey,
    googleApiKey: keys.googleApiKey,
  };
}
