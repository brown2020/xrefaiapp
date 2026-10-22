import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element's content is taller than its box, so a
 * "fade to show more" overlay only appears when something is actually hidden.
 */
export function useIsOverflowing<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const check = () => setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [enabled]);

  return [ref, isOverflowing] as const;
}
