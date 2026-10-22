import { ROUTES } from "@/constants/routes";

/** Bump when the providers or the data sent to them change, so everyone is asked again. */
export const AI_CONSENT_VERSION = "2026-10-ai-providers";

export const AI_CONSENT_PROVIDERS = [
  { name: "OpenAI", use: "GPT text models and all image generation" },
  { name: "Anthropic", use: "Claude text models" },
  { name: "xAI", use: "Grok text models" },
  { name: "Google", use: "Gemini text models" },
] as const;

/** Pages that stay readable without consent: the policies, help, and account deletion. */
const AI_CONSENT_EXEMPT_PATHS: readonly string[] = [
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.support,
  ROUTES.account,
];

export function isAiConsentExemptPath(pathname: string): boolean {
  return AI_CONSENT_EXEMPT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
