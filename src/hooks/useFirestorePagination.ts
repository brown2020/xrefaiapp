import { useState, useEffect, useCallback } from "react";
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
}

interface UseFirestorePaginationReturn<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
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
}: UseFirestorePaginationOptions<T>): UseFirestorePaginationReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);

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

        if (!isInitial && lastDoc) {
          constraints.push(startAfter(lastDoc));
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

        setLastDoc(lastVisible);
        setHasMore(querySnapshot.size === pageSize);
      } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        toast.error(`Failed to load ${collectionName}`);
      } finally {
        if (isInitial) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [
      uid,
      collectionName,
      orderByField,
      orderDirection,
      pageSize,
      transform,
      lastDoc,
    ]
  );

  // Initial fetch
  useEffect(() => {
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, collectionName]);

  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      await fetchData(false);
    }
  }, [fetchData, loadingMore, hasMore]);

  const refresh = useCallback(async () => {
    setLastDoc(null);
    await fetchData(true);
  }, [fetchData]);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
  };
}
