import { Timestamp } from "firebase/firestore";

/**
 * Common state pattern for AI generation features
 */
export interface GenerationState {
  summary: string;
  flagged: string;
  active: boolean;
  thinking: boolean;
}

/**
 * Common state pattern for paginated lists with Firestore
 */
export interface PaginatedListState<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  lastKey: Timestamp | undefined;
}

/**
 * Common select option type used across data files
 */
export interface SelectOption {
  value: string;
  label: string;
}
