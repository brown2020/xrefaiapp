import { useSyncExternalStore } from "react";
import { isReactNativeWebView } from "@/utils/platform";

function subscribeNoop() {
  return () => {};
}

/**
 * True only in a regular browser after hydration. False during SSR and inside
 * the React Native WebView, so web-only controls (credit purchases, Google
 * popup sign-in) never render in the mobile app, not even in server HTML.
 */
export function useShowWebOnly(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => !isReactNativeWebView(),
    () => false
  );
}

/** True inside the React Native WebView after hydration; false during SSR. */
export function useIsInApp(): boolean {
  return useSyncExternalStore(subscribeNoop, isReactNativeWebView, () => false);
}
