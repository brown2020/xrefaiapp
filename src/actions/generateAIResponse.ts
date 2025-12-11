"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { ModelMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

interface SimpleMessage {
  type: "simple";
  systemPrompt: string;
  userPrompt: string;
}

interface ConversationMessage {
  type: "conversation";
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

type MessageInput = SimpleMessage | ConversationMessage;

/**
 * Unified AI response generator supporting both simple prompts and conversations
 */
export async function generateAIResponse(input: MessageInput) {
  const model = openai("gpt-4.1");

  const messages: ModelMessage[] =
    input.type === "simple"
      ? [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ]
      : [
          { role: "system", content: input.systemPrompt },
          ...input.messages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        ];

  const result = streamText({ model, messages });
  const stream = createStreamableValue(result.textStream);
  return stream.value;
}

/**
 * Simple response generation (wrapper for backward compatibility)
 */
export async function generateResponse(
  systemPrompt: string,
  userPrompt: string
) {
  return generateAIResponse({
    type: "simple",
    systemPrompt,
    userPrompt,
  });
}

/**
 * Conversation response generation with memory (wrapper for backward compatibility)
 */
export async function generateResponseWithMemory(
  systemPrompt: string,
  chatHistory: Array<{ prompt: string; response: string }>
) {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const chat of chatHistory) {
    if (chat.prompt) {
      messages.push({ role: "user", content: chat.prompt });
    }
    if (chat.response) {
      messages.push({ role: "assistant", content: chat.response });
    }
  }

  return generateAIResponse({
    type: "conversation",
    systemPrompt,
    messages,
  });
}

