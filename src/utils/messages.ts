/**
 * Shared message utilities for extracting and processing AI message content.
 */

/**
 * Message part structure used in AI SDK messages
 */
export interface MessagePart {
  type: string;
  text?: string;
}

/**
 * Generic message structure that covers both simple and multipart messages
 */
export interface GenericMessage {
  content?: string;
  parts?: MessagePart[];
}

/**
 * Extracts text content from a message that may have content string or parts array.
 * Handles both simple messages (content string) and multipart messages (parts array).
 *
 * @param message - The message object to extract text from
 * @returns The extracted text content
 *
 * @example
 * // Simple message
 * getMessageText({ content: "Hello" }) // returns "Hello"
 *
 * // Multipart message
 * getMessageText({
 *   parts: [
 *     { type: "text", text: "Hello " },
 *     { type: "text", text: "World" }
 *   ]
 * }) // returns "Hello World"
 */
export function getMessageText(message: GenericMessage): string {
  if (message.parts?.length) {
    let text = "";
    for (const part of message.parts) {
      if (part.type === "text" && typeof part.text === "string") {
        text += part.text;
      }
    }
    return text;
  }
  return typeof message.content === "string" ? message.content : "";
}

/**
 * Calculates the word count of a text string.
 *
 * @param text - The text to count words in
 * @returns The number of words
 */
export function calculateWordCount(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const words = text.trim().split(/\s+/);
  return words[0] === "" ? 0 : words.length;
}
