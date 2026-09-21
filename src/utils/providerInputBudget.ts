import { MAX_WORDS_IN_CONTEXT } from "@/constants";
import { calculateWordCount } from "@/utils/messages";

/** Character ceiling for the same budget, so a no-space blob cannot pass as one word. */
export const MAX_PROVIDER_INPUT_CHARS = MAX_WORDS_IN_CONTEXT * 8;

type ChatTurn = { prompt: string; response: string };
type ConversationTurn = { role: "user" | "assistant"; content: string };

export function boundPromptText(
  text: string,
  maxWords = MAX_WORDS_IN_CONTEXT,
  maxChars = MAX_PROVIDER_INPUT_CHARS
): string {
  const charLimited = text.length > maxChars ? text.slice(0, maxChars) : text;
  if (calculateWordCount(charLimited) <= maxWords) return charLimited;
  const words = charLimited.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, Math.max(0, maxWords)).join(" ");
}

export function fitsProviderInputBudget(text: string): boolean {
  return (
    text.length <= MAX_PROVIDER_INPUT_CHARS &&
    calculateWordCount(text) <= MAX_WORDS_IN_CONTEXT
  );
}

export function boundPromptPair(
  systemPrompt: string,
  userPrompt: string
): { systemPrompt: string; userPrompt: string } {
  const system = boundPromptText(systemPrompt, 200, 2_000);
  return {
    systemPrompt: system,
    userPrompt: boundPromptText(
      userPrompt,
      Math.max(0, MAX_WORDS_IN_CONTEXT - calculateWordCount(system)),
      Math.max(0, MAX_PROVIDER_INPUT_CHARS - system.length)
    ),
  };
}

export function boundConversation(
  systemPrompt: string,
  messages: ConversationTurn[]
): { systemPrompt: string; messages: ConversationTurn[] } {
  const system = boundPromptText(systemPrompt, 200, 2_000);
  let wordsLeft = Math.max(0, MAX_WORDS_IN_CONTEXT - calculateWordCount(system));
  let charsLeft = Math.max(0, MAX_PROVIDER_INPUT_CHARS - system.length);
  const kept: ConversationTurn[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const content = boundPromptText(message.content, wordsLeft, charsLeft);
    const words = calculateWordCount(content);
    if (!content || words > wordsLeft || content.length > charsLeft) break;
    kept.push({ role: message.role, content });
    wordsLeft -= words;
    charsLeft -= content.length;
  }
  kept.reverse();
  return { systemPrompt: system, messages: kept };
}

/**
 * Keeps the newest history turns that fit beside the current user message.
 * The current message is not truncated: an over-budget message is rejected
 * before any credit debit.
 */
export function boundChatInput(
  userText: string,
  history: ChatTurn[] | undefined
):
  | { ok: true; userText: string; history: ChatTurn[] }
  | { ok: false; error: "PROMPT_TOO_LONG" } {
  if (!fitsProviderInputBudget(userText)) {
    return { ok: false, error: "PROMPT_TOO_LONG" };
  }

  let wordsLeft = MAX_WORDS_IN_CONTEXT - calculateWordCount(userText);
  let charsLeft = MAX_PROVIDER_INPUT_CHARS - userText.length;
  const kept: ChatTurn[] = [];
  const items = history ?? [];
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const words = calculateWordCount(item.prompt) + calculateWordCount(item.response);
    const chars = item.prompt.length + item.response.length;
    if (words > wordsLeft || chars > charsLeft) break;
    kept.push(item);
    wordsLeft -= words;
    charsLeft -= chars;
  }
  kept.reverse();
  return { ok: true, userText, history: kept };
}
