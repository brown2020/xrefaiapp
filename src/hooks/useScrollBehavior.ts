import { useRef, useState, useCallback } from "react";

export function useScrollBehavior() {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Handle scroll events
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    if (target) {
      const { scrollTop, scrollHeight, clientHeight } = target;
      // Check if user is at bottom (with small threshold for rounding errors)
      const bottom = scrollHeight - scrollTop - clientHeight < 30;
      setIsAtBottom(bottom);
    }
  }, []);

  // Function to check scroll position manually
  const checkIsAtBottom = useCallback((element: HTMLElement | null) => {
    if (element) {
      const { scrollTop, scrollHeight, clientHeight } = element;
      // Check if user is at bottom (with small threshold for rounding errors)
      const bottom = scrollHeight - scrollTop - clientHeight < 30;
      setIsAtBottom(bottom);
    }
  }, []);

  const setupScrollListener = useCallback(
    (element: HTMLElement | null) => {
      if (element) {
        // Initial check of scroll position
        checkIsAtBottom(element);

        // Set up event listener
        element.addEventListener("scroll", handleScroll);

        return () => element.removeEventListener("scroll", handleScroll);
      }
      return () => {};
    },
    [handleScroll, checkIsAtBottom]
  );

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
      setIsAtBottom(true);
    }
  }, []);

  const scrollToBottomWithoutSmooth = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView();
      setIsAtBottom(true);
    }
  }, []);

  return {
    isButtonVisible: !isAtBottom,
    scrollRef,
    setupScrollListener,
    checkIsAtBottom,
    scrollToBottom,
    scrollToBottomWithoutSmooth,
  };
}
