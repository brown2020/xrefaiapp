import type { Analytics } from "firebase/analytics";
import {
  defaultCookieConsentName,
  getCookieConsentValue,
} from "react-cookie-consent";

import { getFirebaseApp } from "@/firebase/firebaseClient";

let analyticsStart: Promise<Analytics | null> | null = null;
let lastLoggedPath: string | null = null;

/**
 * The cookie banner stores acceptance under react-cookie-consent's default
 * name. Analytics must not start until that cookie is "true".
 */
function hasAnalyticsConsent(): boolean {
  if (typeof document === "undefined") return false;
  return getCookieConsentValue(defaultCookieConsentName) === "true";
}

/**
 * Browser-only Firebase Analytics. Uses the measurement ID already on the
 * Firebase app (`NEXT_PUBLIC_FIREBASE_MEASUREMENTID`). No-ops on the server,
 * in unsupported browsers, and before cookie consent.
 */
function startFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) {
    return Promise.resolve(null);
  }
  if (!analyticsStart) analyticsStart = createAnalytics();
  return analyticsStart;
}

async function createAnalytics(): Promise<Analytics | null> {
  const firebaseApp = getFirebaseApp();
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENTID?.trim();
  if (!firebaseApp || !measurementId) return null;

  try {
    const { getAnalytics, initializeAnalytics, isSupported } = await import(
      "firebase/analytics"
    );
    if (!(await isSupported())) return null;
    // Own page_view below. The automatic hit would also send the query
    // string (email-link codes, checkout session ids).
    initializeAnalytics(firebaseApp, {
      config: { send_page_view: false },
    });
    return getAnalytics(firebaseApp);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.warn(`Firebase Analytics unavailable: ${detail}`);
    return null;
  }
}

/**
 * Log a GA4 page_view for a client route. `isCurrent` drops a hit when the
 * route changed while Analytics was still starting.
 */
export async function logAnalyticsPageView(
  pathname: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  if (!pathname || !hasAnalyticsConsent()) return;
  const analytics = await startFirebaseAnalytics();
  if (!analytics || !isCurrent() || lastLoggedPath === pathname) return;

  lastLoggedPath = pathname;
  const { logEvent } = await import("firebase/analytics");
  logEvent(analytics, "page_view", {
    page_path: pathname,
    page_location: `${window.location.origin}${pathname}`,
    page_title: document.title,
  });
}
