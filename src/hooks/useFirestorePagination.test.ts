import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFirestorePagination } from "./useFirestorePagination";
import { getDocs, query, startAfter } from "firebase/firestore";

type DocumentData = Record<string, unknown>;
interface QueryDocumentSnapshot<T = DocumentData> {
  id: string;
  data: () => T;
}

const mockDocs = (
  count: number,
  startId: number = 0
): QueryDocumentSnapshot<DocumentData>[] => {
  return Array.from({ length: count }, (_, i) => {
    const id = `doc-${startId + i}`;
    return {
      id,
      data: () => ({ id, value: `value-${startId + i}` }),
    } as unknown as QueryDocumentSnapshot<DocumentData>;
  });
};

// Stable transform function to prevent infinite re-renders
const stableTransform = (doc: QueryDocumentSnapshot<DocumentData>) => ({
  id: doc.id,
  ...doc.data(),
});

describe("useFirestorePagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("loads initial page and sets hasMore when page is full", async () => {
    const pageSize = 5;
    const docs = mockDocs(pageSize);

    const mockGetDocs = vi.mocked(getDocs);
    mockGetDocs.mockResolvedValue({
      size: pageSize,
      forEach: (callback: (doc: QueryDocumentSnapshot<DocumentData>) => void) => {
        docs.forEach(callback);
      },
    } as never);

    const { result } = renderHook(() =>
      useFirestorePagination({
        uid: "test-uid",
        collectionName: "testCollection",
        pageSize,
        transform: stableTransform,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(pageSize);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.items[0].id).toBe("doc-0");
  });

  it("sets hasMore to false when page is not full", async () => {
    const pageSize = 5;
    const docs = mockDocs(3);

    const mockGetDocs = vi.mocked(getDocs);
    mockGetDocs.mockResolvedValue({
      size: 3,
      forEach: (callback: (doc: QueryDocumentSnapshot<DocumentData>) => void) => {
        docs.forEach(callback);
      },
    } as never);

    const { result } = renderHook(() =>
      useFirestorePagination({
        uid: "test-uid",
        collectionName: "testCollection",
        pageSize,
        transform: stableTransform,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(3);
    expect(result.current.hasMore).toBe(false);
  });

  it("loadMore appends items using cursor from previous page", async () => {
    const pageSize = 5;
    const firstPageDocs = mockDocs(pageSize, 0);
    const secondPageDocs = mockDocs(pageSize, 5);

    const mockGetDocs = vi.mocked(getDocs);
    const mockQuery = vi.mocked(query);
    const mockStartAfter = vi.mocked(startAfter);
    
    let callCount = 0;
    mockGetDocs.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          size: pageSize,
          forEach: (callback: (doc: QueryDocumentSnapshot<DocumentData>) => void) => {
            firstPageDocs.forEach(callback);
          },
        } as never);
      }
      return Promise.resolve({
        size: pageSize,
        forEach: (callback: (doc: QueryDocumentSnapshot<DocumentData>) => void) => {
          secondPageDocs.forEach(callback);
        },
      } as never);
    });

    mockQuery.mockImplementation((...args) => args as never);
    mockStartAfter.mockImplementation((doc) => ({ type: "startAfter", doc }) as never);

    const { result } = renderHook(() =>
      useFirestorePagination({
        uid: "test-uid",
        collectionName: "testCollection",
        pageSize,
        transform: stableTransform,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(5);
    expect(result.current.items[0].id).toBe("doc-0");
    expect(result.current.hasMore).toBe(true);

    // First query should not have startAfter
    expect(mockStartAfter).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.loadingMore).toBe(false));
    expect(result.current.items).toHaveLength(10);
    expect(result.current.items[5].id).toBe("doc-5");
    expect(getDocs).toHaveBeenCalledTimes(2);
    
    // Second query MUST use startAfter with last doc from page 1 (doc-4)
    expect(mockStartAfter).toHaveBeenCalledTimes(1);
    expect(mockStartAfter).toHaveBeenCalledWith(firstPageDocs[4]);
  });

  it("refresh resets cursor and refetches from beginning", async () => {
    const pageSize = 5;
    const firstPageDocs = mockDocs(pageSize, 0);
    const refreshedDocs = mockDocs(pageSize, 100);

    const mockGetDocs = vi.mocked(getDocs);
    
    let callCount = 0;
    mockGetDocs.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          size: pageSize,
          forEach: (callback: (doc: QueryDocumentSnapshot<DocumentData>) => void) => {
            firstPageDocs.forEach(callback);
          },
        } as never);
      }
      return Promise.resolve({
        size: pageSize,
        forEach: (callback: (doc: QueryDocumentSnapshot<DocumentData>) => void) => {
          refreshedDocs.forEach(callback);
        },
      } as never);
    });

    const { result } = renderHook(() =>
      useFirestorePagination({
        uid: "test-uid",
        collectionName: "testCollection",
        pageSize,
        transform: stableTransform,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0].id).toBe("doc-0");

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(5);
    expect(result.current.items[0].id).toBe("doc-100");
  });

  it("clearItems resets items cursor and hasMore", async () => {
    const pageSize = 5;
    const docs = mockDocs(pageSize);

    const mockGetDocs = vi.mocked(getDocs);
    mockGetDocs.mockResolvedValue({
      size: pageSize,
      forEach: (callback: (doc: QueryDocumentSnapshot<DocumentData>) => void) => {
        docs.forEach(callback);
      },
    } as never);

    const { result } = renderHook(() =>
      useFirestorePagination({
        uid: "test-uid",
        collectionName: "testCollection",
        pageSize,
        transform: stableTransform,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(5);
    expect(result.current.hasMore).toBe(true);

    act(() => {
      result.current.clearItems();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.hasMore).toBe(false);
  });

  it("resets and refetches when uid changes", async () => {
    const pageSize = 3;
    const firstUidDocs = mockDocs(pageSize, 0);
    const secondUidDocs = mockDocs(pageSize, 100);

    const mockGetDocs = vi.mocked(getDocs);
    
    let callCount = 0;
    mockGetDocs.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          size: pageSize,
          forEach: (callback: (doc: QueryDocumentSnapshot<DocumentData>) => void) => {
            firstUidDocs.forEach(callback);
          },
        } as never);
      }
      return Promise.resolve({
        size: pageSize,
        forEach: (callback: (doc: QueryDocumentSnapshot<DocumentData>) => void) => {
          secondUidDocs.forEach(callback);
        },
      } as never);
    });

    const { result, rerender } = renderHook(
      ({ uid }) =>
        useFirestorePagination({
          uid,
          collectionName: "testCollection",
          pageSize,
          transform: stableTransform,
        }),
      { initialProps: { uid: "uid-1" } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0].id).toBe("doc-0");

    rerender({ uid: "uid-2" });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0].id).toBe("doc-100");
  });
});
