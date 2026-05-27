import { ROUTES } from "@/constants/routes";

const BASE_URL = "https://xref.ai";

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

/**
 * Normalizes user-controlled return paths to same-origin app paths.
 * Rejects absolute URLs, protocol-relative URLs, backslash variants, and
 * control-character payloads so payment handoff links cannot become open
 * redirects.
 */
export function sanitizeInternalRedirectPath(
  value: unknown,
  fallback: string = ROUTES.account
): string {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed || hasControlCharacter(trimmed)) return fallback;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;

  try {
    const parsed = new URL(trimmed, BASE_URL);
    if (parsed.origin !== BASE_URL) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
