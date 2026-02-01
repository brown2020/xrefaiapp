/**
 * Centralized type definitions
 * Re-exports all types from the types directory
 */

// ============================================================================
// Base Types
// ============================================================================

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

// ============================================================================
// AI Message Types (unified across the app)
// ============================================================================

/** Role types for AI messages */
export type AIMessageRole = "user" | "assistant" | "system";

/** Part of a multipart AI message */
export interface AIMessagePart {
  type: "text" | "image" | "file" | string;
  text?: string;
  image?: string;
  mimeType?: string;
}

/** Unified AI message structure compatible with AI SDK */
export interface AIMessage {
  role: AIMessageRole;
  content: string;
  parts?: AIMessagePart[];
}

/** Chat history item for context building */
export interface ChatHistoryItem {
  prompt: string;
  response: string;
}

// ============================================================================
// Generation Configuration Types
// ============================================================================

/** Configuration for AI generation requests */
export interface GenerationConfig {
  useCredits: boolean;
  modelKey: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  xaiApiKey?: string;
  googleApiKey?: string;
}

/** State for tracking generation progress */
export interface GenerationState {
  isLoading: boolean;
  progress: number;
  error: string | null;
  result: string | null;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Standard API error response */
export interface APIErrorResponse {
  error: string;
  message?: string;
  code?: string;
}

/** Standard API success response */
export interface APISuccessResponse<T = unknown> {
  ok: true;
  data?: T;
}

// ============================================================================
// Re-export specific types
// ============================================================================

export type { ChatType } from "./ChatType";
export type { UserHistoryType } from "./UserHistoryType";
export type { PromptDataType } from "./PromptDataType";
export type { SelectOption } from "./common";

// Re-export type guards
export * from "./guards";
