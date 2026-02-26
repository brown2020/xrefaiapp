import { useAuthStore } from "@/zustand/useAuthStore";
import { saveHistoryServer } from "@/actions/serverHistory";

export interface HistoryEntry {
  prompt: string;
  response: string;
  topic: string;
  words: string;
  xrefs?: string[];
  derivedFromId?: string;
  tool?: string;
}

export function useHistorySaver() {
  const uid = useAuthStore((s) => s.uid);

  const saveHistory = async (entry: HistoryEntry): Promise<string | null> => {
    if (!uid) return null;
    return saveHistoryServer(entry);
  };

  return { saveHistory, uid };
}
