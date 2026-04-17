import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  uid: string | null;
  collectionName: string;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  pageSize?: number;
  transform: (doc: QueryDocumentSnapshot<DocumentData>) => T;
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
  /** Entries from the live first-page subscription (newest-first). */
  liveEntries: FirestoreEntry<T>[];
  /** Entries loaded via pagination (older than the live page). */
  olderEntries: FirestoreEntry<T>[];
  /**
   * Cursor for the NEXT call to `loadMore`. Points at the last live document
   * on initial load, then advances as older pages are fetched. Stays stable
   * even when new live documents arrive so pagination keeps working.
   */
  nextPageCursor: QueryDocumentSnapshot<DocumentData> | null;
  /** Whether there are more older documents to fetch via `loadMore`. */
  hasMore: boolean;
};

function dedupeEntries<T>(entries: FirestoreEntry<T>[]): FirestoreEntry<T>[] {
  const seenDocIds = new Set<string>();
  return entries.filter((entry) => {
    if (seenDocIds.has(entry.doc.id)) return false;
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
 * Generic hook for real-time paginated Firestore queries.
 * Uses `onSnapshot` for live updates with `getDocs`-based pagination.
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
  /**
   * Tracks whether we've received the first snapshot — only then do we know
   * the "live window" size and thus whether more old docs may exist.
   */
  const initializedRef = useRef(false);

  const onDataChangeRef = useRef(onDataChange);
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const items = useMemo(() => {
    const liveDocIds = new Set(state.liveEntries.map((entry) => entry.doc.id));
    return [
      ...state.liveEntries,
      ...state.olderEntries.filter((entry) => !liveDocIds.has(entry.doc.id)),
    ].map((entry) => entry.item);
  }, [state.liveEntries, state.olderEntries]);

  useEffect(() => {
    if (!uid) {
      initializedRef.current = false;
      setState(createInitialState<T>());
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    initializedRef.current = false;
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

          const isFirstSnapshot = !initializedRef.current;
          const liveCursor = nextLiveEntries.at(-1)?.doc ?? null;

          // Only SEED the cursor/hasMore on the very first snapshot, or when
          // we have not yet paginated. Once pagination starts, later live
          // updates must not clobber the cursor (it advances through older
          // pages and live changes never point there).
          const shouldSeedCursor =
            isFirstSnapshot ||
            (prev.olderEntries.length === 0 && prev.nextPageCursor === null);

          return {
            liveEntries: nextLiveEntries,
            olderEntries,
            nextPageCursor: shouldSeedCursor ? liveCursor : prev.nextPageCursor,
            hasMore: shouldSeedCursor
              ? querySnapshot.size === pageSize
              : prev.hasMore,
          };
        });
        initializedRef.current = true;
        setLoading(false);
        onDataChangeRef.current?.();
      },
      (error) => {
        if (error.code !== "permission-denied") {
          console.error(`Error fetching ${collectionName}:`, error);
        }
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, collectionName, orderByField, orderDirection, pageSize]);

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
        const lastFetched = querySnapshot.docs.at(-1);

        return {
          liveEntries: prev.liveEntries,
          olderEntries: dedupeEntries([
            ...prev.olderEntries,
            ...fetchedEntries.filter((entry) => !liveDocIds.has(entry.doc.id)),
          ]),
          nextPageCursor: lastFetched ?? prev.nextPageCursor,
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
