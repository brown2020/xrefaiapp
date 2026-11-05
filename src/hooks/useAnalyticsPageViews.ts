import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { logAnalyticsPageView } from "@/firebase/firebaseAnalytics";

/**
 * Sends page_view on the first consented load and on later client navigations.
 * Query strings are intentionally omitted.
 */
export function useAnalyticsPageViews(): void {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    void logAnalyticsPageView(pathname, () => active);
    return () => {
      active = false;
    };
  }, [pathname]);
}
