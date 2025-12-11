import { useEffect } from "react";

/**
 * Hook to scroll to result elements after content is generated
 * @param summary - The generated summary/response
 * @param flagged - Any flagged content message
 */
export function useScrollToResult(summary: string, flagged: string) {
  useEffect(() => {
    const targetId = summary ? "response" : flagged ? "flagged" : null;
    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [summary, flagged]);
}

