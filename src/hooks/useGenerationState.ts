import { useState, useCallback } from "react";

interface GenerationState {
  /** The generated result */
  summary: string;
  /** Error or flagged content message */
  flagged: string;
  /** Whether the form is ready for submission */
  active: boolean;
  /** Whether generation is in progress */
  thinking: boolean;
  /** Progress percentage (0-100) */
  progress: number;
}

interface GenerationActions {
  /** Start the generation process */
  startGeneration: () => void;
  /** Complete generation with success */
  completeWithSuccess: (result: string) => void;
  /** Complete generation with error */
  completeWithError: (error: string) => void;
  /** Update progress */
  setProgress: (progress: number) => void;
  /** Reset all state */
  reset: () => void;
}

type UseGenerationStateReturn = GenerationState & GenerationActions;

/**
 * Reusable hook for managing AI generation state
 * Provides consistent state management across all generation tools
 */
export function useGenerationState(): UseGenerationStateReturn {
  const [summary, setSummary] = useState("");
  const [flagged, setFlagged] = useState("");
  const [active, setActive] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [progress, setProgress] = useState(0);

  const startGeneration = useCallback(() => {
    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);
    setProgress(0);
  }, []);

  const completeWithSuccess = useCallback((result: string) => {
    setSummary(result);
    setThinking(false);
    setProgress(100);
    setActive(true);
  }, []);

  const completeWithError = useCallback((error: string) => {
    setFlagged(error);
    setThinking(false);
    setProgress(0);
    setActive(true);
  }, []);

  const reset = useCallback(() => {
    setSummary("");
    setFlagged("");
    setActive(true);
    setThinking(false);
    setProgress(0);
  }, []);

  return {
    summary,
    flagged,
    active,
    thinking,
    progress,
    startGeneration,
    completeWithSuccess,
    completeWithError,
    setProgress,
    reset,
  };
}
