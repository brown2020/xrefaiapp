import { useState, useEffect, useCallback } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  getDocs,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";

interface UseFirestoreRealtimeOptions<T> {
  /** User ID for the collection path */
  uid: string | null;
  /** Sub-collection name under users/{uid}/ */
  collectionName: string;
  /** Field to order by */
  orderByField?: string;
  /** Order direction */
  orderDirection?: "asc" | "desc";
  /** Number of items per page */
  pageSize?: number;
  /** Transform function to map document data to your type */
  transform: (doc: QueryDocumentSnapshot<DocumentData>) => T;
  /** Callback when new data arrives */
  onDataChange?: () => void;
}

interface UseFirestoreRealtimeReturn<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Generic hook for real-time paginated Firestore queries
 * Uses onSnapshot for live updates with pagination support
 */
export function useFirestoreRealtime<T>({
  uid,
  collectionName,
  orderByField = "timestamp",
  orderDirection = "desc",
  pageSize = 20,
  transform,
  onDataChange,
}: UseFirestoreRealtimeOptions<T>): UseFirestoreRealtimeReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<Timestamp | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Initial real-time subscription
  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", uid, collectionName),
      orderBy(orderByField, orderDirection),
      limit(pageSize)
    );

    const unsub = onSnapshot(
      q,
      (querySnapshot) => {
        const newItems: T[] = [];
        let lastTimestamp: Timestamp | null = null;

        querySnapshot.forEach((doc) => {
          if (doc.exists()) {
            newItems.push(transform(doc));
            if (newItems.length === pageSize) {
              lastTimestamp = doc.data()?.[orderByField] || null;
            }
          }
        });

        setItems(newItems);
        setLoading(false);
        setHasMore(querySnapshot.size === pageSize);
        setLastDoc(lastTimestamp);
        onDataChange?.();
      },
      (error) => {
        // Ignore permission errors during sign-out
        if (error.code !== "permission-denied") {
          console.error(`Error fetching ${collectionName}:`, error);
        }
      }
    );

    return () => unsub();
  }, [
    uid,
    collectionName,
    orderByField,
    orderDirection,
    pageSize,
    transform,
    onDataChange,
  ]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!uid || !lastDoc || loadingMore) return;

    setLoadingMore(true);

    const constraints: QueryConstraint[] = [
      orderBy(orderByField, orderDirection),
      startAfter(lastDoc),
      limit(pageSize),
    ];

    const q = query(
      collection(db, "users", uid, collectionName),
      ...constraints
    );
    const querySnapshot = await getDocs(q);

    const newItems: T[] = [];
    let newLastTimestamp: Timestamp | null = null;

    querySnapshot.forEach((doc) => {
      if (doc.exists()) {
        newItems.push(transform(doc));
        if (newItems.length === pageSize) {
          newLastTimestamp = doc.data()?.[orderByField] || null;
        }
      }
    });

    setItems((prev) => [...prev, ...newItems]);
    setHasMore(querySnapshot.size === pageSize);
    setLastDoc(newLastTimestamp);
    setLoadingMore(false);
  }, [
    uid,
    lastDoc,
    loadingMore,
    collectionName,
    orderByField,
    orderDirection,
    pageSize,
    transform,
  ]);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  };
}
