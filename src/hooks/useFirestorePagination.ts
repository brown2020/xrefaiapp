import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import toast from "react-hot-toast";

interface UseFirestorePaginationOptions<T> {
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
  /** Plain sentence shown when the page cannot load */
  loadErrorMessage?: string;
}

interface UseFirestorePaginationReturn<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Drops loaded items after the caller deleted them on the server. */
  clearItems: () => void;
}

/**
 * Generic hook for paginated Firestore queries
 */
export function useFirestorePagination<T>({
  uid,
  collectionName,
  orderByField = "timestamp",
  orderDirection = "desc",
  pageSize = 20,
  transform,
  loadErrorMessage,
}: UseFirestorePaginationOptions<T>): UseFirestorePaginationReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // Use ref for lastDoc to avoid useCallback dependency issues
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  // Synchronous in-flight guard: `loadingMore` is async state, so two calls in
  // the same tick can both see it as false and fetch/append the same page.
  const loadMoreInFlightRef = useRef(false);

  const fetchData = useCallback(
    async (isInitial: boolean = true) => {
      if (!uid) {
        setItems([]);
        setLoading(false);
        return;
      }

      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const collectionRef = collection(db, "users", uid, collectionName);
        const constraints: QueryConstraint[] = [
          orderBy(orderByField, orderDirection),
          limit(pageSize),
        ];

        if (!isInitial && lastDocRef.current) {
          constraints.push(startAfter(lastDocRef.current));
        }

        const q = query(collectionRef, ...constraints);
        const querySnapshot = await getDocs(q);

        const newItems: T[] = [];
        let lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;

        querySnapshot.forEach((doc) => {
          newItems.push(transform(doc));
          lastVisible = doc;
        });

        if (isInitial) {
          setItems(newItems);
        } else {
          setItems((prev) => [...prev, ...newItems]);
        }

        lastDocRef.current = lastVisible;
        setHasMore(querySnapshot.size === pageSize);
      } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        toast.error(
          loadErrorMessage ?? `Could not load ${collectionName}. Please try again.`
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      uid,
      collectionName,
      orderByField,
      orderDirection,
      pageSize,
      transform,
      loadErrorMessage,
    ]
  );

  // Initial fetch
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    if (loadMoreInFlightRef.current || loadingMore || !hasMore) return;
    loadMoreInFlightRef.current = true;
    try {
      await fetchData(false);
    } finally {
      loadMoreInFlightRef.current = false;
    }
  }, [fetchData, loadingMore, hasMore]);

  const refresh = useCallback(async () => {
    lastDocRef.current = null;
    await fetchData(true);
  }, [fetchData]);

  const clearItems = useCallback(() => {
    setItems([]);
    lastDocRef.current = null;
    setHasMore(false);
  }, []);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    clearItems,
  };
}
