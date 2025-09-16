"use server";

import { createStreamableValue } from '@ai-sdk/rsc';
import { ModelMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { ChatType } from "@/types/ChatType"; // Import ChatType

// New function that accepts a list of ChatType and converts it to CoreMessage[]
export async function generateResponseWithMemory(
  systemPrompt: string,
  chatlist: ChatType[]
) {
  const model = openai("gpt-4o");

  // Convert ChatType[] to CoreMessage[]
  const allMessages: ModelMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...chatlist.map((chat) => {
      if (chat.prompt) {
        return { role: "user", content: chat.prompt } as ModelMessage; // User prompt
      } else if (chat.response) {
        return { role: "assistant", content: chat.response } as ModelMessage; // AI response
      } else {
        // Handle cases where neither prompt nor response is valid, adjust if needed
        throw new Error(`Invalid chat entry: ${chat.id}`);
      }
    }),
  ];

  // Stream the response from the AI model
  const result = streamText({
    model,
    messages: allMessages, // Send the entire list of converted messages
  });

  // Return a streamable response
  const stream = createStreamableValue(result.textStream);
  return stream.value;
}
