/**
 * Centralized type definitions
 * Re-exports all types from the types directory
 */

// Base message interface shared across chat and history
export interface BaseMessage {
  id: string;
  prompt: string;
  response: string;
}

// Common Firestore document transform type
export type FirestoreDocTransform<T> = (doc: {
  data: () => Record<string, unknown>;
  id: string;
}) => T;

// Re-export specific types
export type { ChatType } from "./ChatType";
export type { UserHistoryType } from "./UserHistoryType";
export type { PromptDataType } from "./PromptDataType";
export type { SelectOption } from "./common";
