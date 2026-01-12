/**
 * Centralized route configuration
 * Single source of truth for all application routes
 */

export const ROUTES = {
  home: "/",
  chat: "/chat",
  tools: "/tools",
  history: "/history",
  account: "/account",
  about: "/about",
  terms: "/terms",
  privacy: "/privacy",
  support: "/support",
  loginFinish: "/loginfinish",
  paymentAttempt: "/payment-attempt",
  paymentSuccess: "/payment-success",
} as const;

/**
 * Routes that require authentication
 * Used by proxy.ts for edge-level protection
 */
export const PROTECTED_ROUTES = [
  ROUTES.chat,
  ROUTES.tools,
  ROUTES.history,
  ROUTES.account,
  ROUTES.paymentAttempt,
  ROUTES.paymentSuccess,
] as const;

/**
 * Routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.about,
  ROUTES.terms,
  ROUTES.privacy,
  ROUTES.support,
] as const;

/**
 * Routes where the footer should be hidden
 */
export const FOOTER_HIDDEN_ROUTES = [
  ROUTES.chat,
  ROUTES.tools,
  ROUTES.history,
  ROUTES.account,
  ROUTES.paymentAttempt,
  ROUTES.paymentSuccess,
] as const;

/**
 * Navigation menu items for header
 */
export const NAV_MENU_ITEMS = [
  { label: "Chat", href: ROUTES.chat },
  { label: "Tools", href: ROUTES.tools },
  { label: "History", href: ROUTES.history },
  { label: "Account", href: ROUTES.account },
] as const;

/**
 * Footer navigation links
 */
export const FOOTER_MENU_ITEMS = [
  { label: "About", href: ROUTES.about },
  { label: "Terms", href: ROUTES.terms },
  { label: "Privacy", href: ROUTES.privacy },
  { label: "Support", href: ROUTES.support },
] as const;
