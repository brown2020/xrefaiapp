import { useEffect, useState } from "react";

/**
 * Hook to handle client-side setup tasks:
 * - Viewport height adjustment for mobile browsers
 * - WebView detection for React Native
 */
export function useClientSetup() {
  const [isClient, setIsClient] = useState(false);
  const [isWebView, setIsWebView] = useState(false);

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);

    // Detect React Native WebView
    setIsWebView(Boolean(window.ReactNativeWebView));

    // Adjust viewport height for mobile browsers
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
