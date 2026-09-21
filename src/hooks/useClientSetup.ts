import { useEffect, useSyncExternalStore } from "react";

function subscribeToNothing() {
  return () => {};
}

function readIsBrowser() {
  return true;
}

function readIsServer() {
  return false;
}

function readIsWebView() {
  return Boolean(window.ReactNativeWebView);
}

/**
 * Hook to handle client-side setup tasks:
 * - Viewport height adjustment for mobile browsers
 * - WebView detection for React Native
 */
export function useClientSetup() {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    readIsBrowser,
    readIsServer
  );
  const isWebView = useSyncExternalStore(
    subscribeToNothing,
    readIsWebView,
    readIsServer
  );

  useEffect(() => {
    function adjustHeight() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }

    adjustHeight();
    window.addEventListener("resize", adjustHeight);
    window.addEventListener("orientationchange", adjustHeight);

    return () => {
      window.removeEventListener("resize", adjustHeight);
      window.removeEventListener("orientationchange", adjustHeight);
    };
  }, []);

  return { isClient, isWebView };
}
