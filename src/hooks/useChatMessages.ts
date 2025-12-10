import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  getDocs,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import { ChatType } from "@/types/ChatType";

const MAX_LOAD = 30;

export function useChatMessages(uid: string) {
  const [chatlist, setChatlist] = useState<ChatType[]>([]);
  const [lastKey, setLastKey] = useState<Timestamp | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [responseSaved, setResponseSaved] = useState(false);

  // Initial load of chat messages from Firebase
  useEffect(() => {
    if (!uid) {
      setChatlist([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", uid, "chats"),
      orderBy("timestamp", "desc"),
      limit(MAX_LOAD)
    );

    const unsub = onSnapshot(
      q,
      (querySnapshot) => {
        const chats: ChatType[] = [];
        let newLastKey: Timestamp | undefined = undefined;

        querySnapshot.forEach((doc) => {
          if (doc.exists()) {
            const data = doc.data();
            chats.push({
              id: data?.id || doc.id,
              prompt: data?.prompt,
              response: data?.response,
              seconds: data?.timestamp.seconds,
            });

            if (chats.length === MAX_LOAD) {
              newLastKey = data?.timestamp || undefined;
            }
          }
        });

        setChatlist(chats);
        setLoading(false);
        setLastKey(newLastKey);

        if (responseSaved) {
          setResponseSaved(false);
        }
      },
      (error) => {
        // Ignore permission errors that happen during sign-out
        if (error.code !== "permission-denied") {
          console.error("Error fetching chat messages:", error);
        }
      }
    );

    return () => unsub();
  }, [uid, responseSaved]);

  // Load more messages (pagination)
  const loadMoreChats = async () => {
    if (!uid || !lastKey) return;

    setLoadingMore(true);
    const q = query(
      collection(db, "users", uid, "chats"),
      orderBy("timestamp", "desc"),
      startAfter(lastKey),
      limit(MAX_LOAD)
    );

    const querySnapshot = await getDocs(q);
    const newChats: ChatType[] = [];
    let newLastKey: Timestamp | undefined = undefined;

    querySnapshot.forEach((doc) => {
      if (doc.exists()) {
        const data = doc.data();
        newChats.push({
          id: data?.id || doc.id,
          prompt: data?.prompt,
          response: data?.response,
          seconds: data?.timestamp.seconds,
        });

        if (newChats.length === MAX_LOAD) {
          newLastKey = data?.timestamp || undefined;
        }
      }
    });

    setChatlist((prevChats) => [...prevChats, ...newChats]);
    setLastKey(newLastKey);
    setLoadingMore(false);
  };

  const markResponseSaved = () => {
    setResponseSaved(true);
  };

  return {
    chatlist,
    loading,
    loadingMore,
    lastKey,
    loadMoreChats,
    markResponseSaved,
  };
}
