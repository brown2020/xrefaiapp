import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock Firebase client
vi.mock("@/firebase/firebaseClient", () => ({
  db: {},
  auth: {},
}));

// Mock all firebase/firestore exports
vi.mock("firebase/firestore", async () => {
  return {
    collection: vi.fn(),
    getDocs: vi.fn(),
    limit: vi.fn((n) => ({ type: "limit", value: n })),
    orderBy: vi.fn((field, dir) => ({ type: "orderBy", field, dir })),
    query: vi.fn(),
    startAfter: vi.fn((doc) => ({ type: "startAfter", doc })),
  };
});

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));
