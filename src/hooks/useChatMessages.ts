import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { ChatType } from "@/types/ChatType";
import { MAX_CHAT_LOAD } from "@/constants";
import { useFirestoreRealtime } from "./useFirestoreRealtime";

/**
 * Hook for managing chat messages with real-time updates
 * Built on top of useFirestoreRealtime for consistency
 */
export function useChatMessages(uid: string) {
  const [responseSaved, setResponseSaved] = useState(false);

  // Use ref to track responseSaved to avoid recreating callback on every state change
  // This prevents the realtime listener from being recreated unnecessarily
  const responseSavedRef = useRef(responseSaved);

  // Keep ref in sync with state
  useEffect(() => {
    responseSavedRef.current = responseSaved;
  }, [responseSaved]);

  // Transform Firestore document to ChatType
  const transformChat = useCallback(
    (doc: QueryDocumentSnapshot<DocumentData>): ChatType => {
      const data = doc.data();
      return {
        id: data?.id || doc.id,
        prompt: data?.prompt,
        response: data?.response,
        seconds: data?.timestamp?.seconds || 0,
      };
    },
    []
  );

  // Handle data changes (reset responseSaved flag)
  // Uses ref instead of state in dependency array to prevent callback recreation
  const handleDataChange = useCallback(() => {
    if (responseSavedRef.current) {
      setResponseSaved(false);
    }
  }, []); // Empty deps - uses ref for current value

  const {
    items: chatlist,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useFirestoreRealtime<ChatType>({
    uid: uid || null,
    collectionName: "chats",
    orderByField: "timestamp",
    orderDirection: "desc",
    pageSize: MAX_CHAT_LOAD,
    transform: transformChat,
    onDataChange: handleDataChange,
  });

  const markResponseSaved = useCallback(() => {
    setResponseSaved(true);
  }, []);

  // Memoize hasMore based on list length for backward compatibility
  const lastKey = useMemo(() => (hasMore ? true : undefined), [hasMore]);

  return {
    chatlist,
    loading,
    loadingMore,
    lastKey,
    loadMoreChats: loadMore,
    markResponseSaved,
  };
}
