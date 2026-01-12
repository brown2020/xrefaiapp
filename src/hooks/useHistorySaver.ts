import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import { useAuthStore } from "@/zustand/useAuthStore";

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

    const docRef = doc(collection(db, "users", uid, "summaries"));
    await setDoc(docRef, {
      id: docRef.id,
      prompt: entry.prompt,
      response: entry.response,
      topic: entry.topic,
      words: entry.words,
      derivedFromId: entry.derivedFromId ?? null,
      tool: entry.tool ?? null,
      xrefs: entry.xrefs ?? [],
      timestamp: Timestamp.now(),
    });
    return docRef.id;
  };

  return { saveHistory, uid };
}






