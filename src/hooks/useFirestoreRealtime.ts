import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

type FirestoreEntry<T> = {
  doc: QueryDocumentSnapshot<DocumentData>;
  item: T;
};

type FirestoreRealtimeState<T> = {
  liveEntries: FirestoreEntry<T>[];
  olderEntries: FirestoreEntry<T>[];
  nextPageCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

function dedupeEntries<T>(entries: FirestoreEntry<T>[]): FirestoreEntry<T>[] {
  const seenDocIds = new Set<string>();

  return entries.filter((entry) => {
    if (seenDocIds.has(entry.doc.id)) {
      return false;
    }
    seenDocIds.add(entry.doc.id);
    return true;
  });
}

function createInitialState<T>(): FirestoreRealtimeState<T> {
  return {
    liveEntries: [],
    olderEntries: [],
    nextPageCursor: null,
    hasMore: false,
  };
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
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [state, setState] = useState<FirestoreRealtimeState<T>>(() =>
    createInitialState<T>()
  );

  // Stabilize callbacks via refs so the snapshot listener isn't recreated on every render
  const onDataChangeRef = useRef(onDataChange);
  useEffect(() => { onDataChangeRef.current = onDataChange; }, [onDataChange]);

  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);

  const items = useMemo(() => {
    const liveDocIds = new Set(state.liveEntries.map((entry) => entry.doc.id));
    return [
      ...state.liveEntries,
      ...state.olderEntries.filter((entry) => !liveDocIds.has(entry.doc.id)),
    ].map((entry) => entry.item);
  }, [state.liveEntries, state.olderEntries]);

  useEffect(() => {
    if (!uid) {
      setState(createInitialState<T>());
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    setState(createInitialState<T>());
    setLoading(true);

    const q = query(
      collection(db, "users", uid, collectionName),
      orderBy(orderByField, orderDirection),
      limit(pageSize)
    );

    const unsub = onSnapshot(
      q,
      (querySnapshot) => {
        const nextLiveEntries = querySnapshot.docs
          .filter((doc) => doc.exists())
          .map((doc) => ({
            doc,
            item: transformRef.current(doc),
          }));

        setState((prev) => {
          const nextLiveIds = new Set(
            nextLiveEntries.map((entry) => entry.doc.id)
          );
          const shiftedEntries = prev.liveEntries.filter(
            (entry) => !nextLiveIds.has(entry.doc.id)
          );
          const olderEntries = dedupeEntries([
            ...shiftedEntries,
            ...prev.olderEntries.filter((entry) => !nextLiveIds.has(entry.doc.id)),
          ]);
          const liveCursor =
            nextLiveEntries.at(-1)?.doc ?? null;

          return {
            liveEntries: nextLiveEntries,
            olderEntries,
            nextPageCursor:
              prev.olderEntries.length > 0 ? prev.nextPageCursor : liveCursor,
            hasMore:
              prev.olderEntries.length > 0
                ? prev.hasMore
                : querySnapshot.size === pageSize,
          };
        });
        setLoading(false);
        onDataChangeRef.current?.();
      },
      (error) => {
        // Ignore permission errors during sign-out
        if (error.code !== "permission-denied") {
          console.error(`Error fetching ${collectionName}:`, error);
        }
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, collectionName, orderByField, orderDirection, pageSize]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!uid || !state.nextPageCursor || loadingMore || !state.hasMore) return;

    setLoadingMore(true);
    try {
      const constraints: QueryConstraint[] = [
        orderBy(orderByField, orderDirection),
        startAfter(state.nextPageCursor),
        limit(pageSize),
      ];

      const q = query(
        collection(db, "users", uid, collectionName),
        ...constraints
      );
      const querySnapshot = await getDocs(q);
      const fetchedEntries = querySnapshot.docs
        .filter((doc) => doc.exists())
        .map((doc) => ({
          doc,
          item: transformRef.current(doc),
        }));

      setState((prev) => {
        const liveDocIds = new Set(prev.liveEntries.map((entry) => entry.doc.id));

        return {
          liveEntries: prev.liveEntries,
          olderEntries: dedupeEntries([
            ...prev.olderEntries,
            ...fetchedEntries.filter((entry) => !liveDocIds.has(entry.doc.id)),
          ]),
          nextPageCursor: querySnapshot.docs.at(-1) ?? prev.nextPageCursor,
          hasMore: querySnapshot.size === pageSize,
        };
      });
    } catch (error) {
      console.error(`Error loading more ${collectionName}:`, error);
    } finally {
      setLoadingMore(false);
    }
  }, [
    uid,
    collectionName,
    orderByField,
    orderDirection,
    pageSize,
    loadingMore,
    state.hasMore,
    state.nextPageCursor,
  ]);

  return {
    items,
    loading,
    loadingMore,
    hasMore: state.hasMore,
    loadMore,
  };
}
