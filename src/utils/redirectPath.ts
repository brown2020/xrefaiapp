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
 * Explicit allowlist of valid post-login redirect destinations.
 * Using an allowlist is stricter security than accepting any same-origin path.
 */
const ALLOWED_REDIRECT_PATHS = [
  ROUTES.chat,
  ROUTES.tools,
  ROUTES.history,
  ROUTES.account,
  ROUTES.paymentSuccess,
] as const;

/**
 * Validates a redirect path against the allowlist of known app routes.
 * Returns the exact matched ROUTES constant or null if not allowed.
 * This ensures we only redirect to known, allowlisted constants.
 */
function validateAgainstAllowlist(pathname: string): typeof ROUTES[keyof typeof ROUTES] | null {
  // Exact match - return the constant itself
  for (const allowed of ALLOWED_REDIRECT_PATHS) {
    if (pathname === allowed) {
      // Return the ROUTES constant, not the input
      return allowed;
    }
  }
  
  // Dynamic segment match (e.g. /chat/123) - return base route
  for (const allowed of ALLOWED_REDIRECT_PATHS) {
    if (pathname.startsWith(`${allowed}/`)) {
      // Return the ROUTES constant base, not the input
      return allowed;
    }
  }
  
  return null;
}

/**
 * Normalizes user-controlled return paths to allowlisted app paths.
 * 
 * Security model:
 * 1. Rejects absolute URLs, protocol-relative URLs, backslash variants
 * 2. Rejects control characters
 * 3. Validates against explicit allowlist of known routes
 * 4. Returns the allowlist entry (not raw input) if matched
 * 
 * This is stricter than same-origin validation: only known app routes are allowed.
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
    
    const pathname = parsed.pathname;
    const matchedRoute = validateAgainstAllowlist(pathname);
    
    if (!matchedRoute) {
      // Path is same-origin but not in allowlist
      return fallback;
    }
    
    // Return the validated pathname (from parsed URL) plus query/hash
    // This ensures we redirect to normalized paths only
    return `${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
