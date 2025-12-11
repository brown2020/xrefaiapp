import { useState, useCallback, useMemo } from "react";
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
  const handleDataChange = useCallback(() => {
    if (responseSaved) {
      setResponseSaved(false);
    }
  }, [responseSaved]);

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
