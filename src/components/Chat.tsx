"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useAuthStore } from "@/zustand/useAuthStore";
import ScrollToBottom from "react-scroll-to-bottom";
import useProfileStore from "@/zustand/useProfileStore";
import { useChatMessages } from "@/hooks/useChatMessages";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import StreamingResponse from "@/components/StreamingResponse";
import { LoadingSpinner, InlineSpinner } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { validateContentWithToast } from "@/utils/contentGuard";
import { MAX_WORDS_IN_CONTEXT } from "@/constants";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import { usePaywallStore } from "@/zustand/usePaywallStore";
import { CREDITS_COSTS } from "@/constants/credits";
import toast from "react-hot-toast";

export default function Chat() {
  const uid = useAuthStore((s) => s.uid);
  // Subscribe ONLY to the photo URL (avoid re-renders on credit changes).
  const profilePhotoUrl = useProfileStore((s) => s.profile.photoUrl);
  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const openPaywall = usePaywallStore((s) => s.openPaywall);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const {
    chatlist,
    loading,
    loadingMore,
    lastKey,
    loadMoreChats,
    markResponseSaved,
  } = useChatMessages(uid);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        credentials: "include",
      }),
    []
  );

  const { messages, sendMessage, setMessages, status } = useChat({
    transport,
    experimental_throttle: 100,
    onFinish: async ({ message, messages: allMessages }) => {
      const latestUser = [...allMessages].reverse().find((m) => m.role === "user");
      const prompt = latestUser ? getMessageText(latestUser) : "";
      const response = getMessageText(message);

      if (uid && prompt && response) {
        await addDoc(collection(db, "users", uid, "chats"), {
          prompt,
          response,
          timestamp: Timestamp.now(),
        });
        markResponseSaved();
        if (profile.useCredits) {
          await fetchProfile();
        }
      }

      setMessages([]);
    },
    onError: (error) => {
      if (
        error instanceof Error &&
        (error.message === "INSUFFICIENT_CREDITS" ||
          error.message.toLowerCase().includes("insufficient"))
      ) {
        toast.error("Not enough credits. Please buy more credits in Account.");
        openPaywall({
          actionLabel: "Chat message",
          requiredCredits: CREDITS_COSTS.chatMessage,
          redirectPath: ROUTES.chat,
        });
        return;
      }
      toast.error("Chat request failed. Please try again.");
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const historyForRequest = useMemo(() => {
    const history: Array<{ prompt: string; response: string }> = [];
    let wordCount = 0;
    for (let i = 0; i < chatlist.length; i++) {
      const chat = chatlist[i];
      const promptWords = chat.prompt.split(" ").length;
      const responseWords = chat.response.split(" ").length;
      if (wordCount + promptWords + responseWords <= MAX_WORDS_IN_CONTEXT) {
        history.push({ prompt: chat.prompt, response: chat.response });
        wordCount += promptWords + responseWords;
      } else {
        break;
      }
    }
    return history.reverse();
  }, [chatlist]);

  const handleSendPrompt = useCallback(async () => {
    if (!input.trim()) return;
    if (!validateContentWithToast(input)) return;

    const inputValue = input.trim();
    setInput("");

    await sendMessage(
      { text: inputValue },
      {
        body: {
          history: historyForRequest,
          modelKey: profile.text_model,
          useCredits: profile.useCredits,
          openaiApiKey: profile.openai_api_key,
          anthropicApiKey: profile.anthropic_api_key,
          xaiApiKey: profile.xai_api_key,
          googleApiKey: profile.google_api_key,
        },
      }
    );
  }, [historyForRequest, input, profile, sendMessage]);

  const MAX_VISIBLE_CHATS = 80;
  // Memoize reversed chat list to avoid recalculating on every render
  const reversedChatlist = useMemo(
    () => chatlist.slice().reverse(),
    [chatlist]
  );
  const visibleChatlist = useMemo(() => {
    if (reversedChatlist.length <= MAX_VISIBLE_CHATS) {
      return reversedChatlist;
    }
    return reversedChatlist.slice(-MAX_VISIBLE_CHATS);
  }, [reversedChatlist]);

  const streamingUserText = useMemo(() => {
    const latestUser = [...messages].reverse().find((m) => m.role === "user");
    return latestUser ? getMessageText(latestUser) : "";
  }, [messages]);

  const streamingAssistantText = useMemo(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    return latestAssistant ? getMessageText(latestAssistant) : "";
  }, [messages]);

  return (
    <div className="flex flex-col h-full relative bg-muted/30 w-full">
      {loading ? (
        <div className="flex flex-1 items-center justify-center h-full">
          <LoadingSpinner size="lg" text="Loading your conversation..." />
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 relative group/chat w-full">
            <ScrollToBottom
              className="h-full w-full overflow-y-auto scroll-smooth"
              scrollViewClassName="h-full w-full overflow-x-hidden px-4"
              followButtonClassName="hidden"
            >
              <div className="max-w-4xl mx-auto pt-8 pb-4">
                {/* Load More Button */}
                {lastKey && (
                  <div className="flex justify-center mb-8">
                    <button
                      onClick={loadMoreChats}
                      disabled={loadingMore}
                      className="text-xs font-medium text-[#192449] hover:text-blue-700 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-full transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loadingMore && <InlineSpinner size="sm" />}
                      {loadingMore
                        ? "Loading older messages..."
                        : "Load older messages"}
                    </button>
                  </div>
                )}

                {/* Chat List */}
                <div className="flex flex-col space-y-2">
                  {!isLoading && reversedChatlist.length === 0 && (
                    <div className="py-10">
                      <div className="max-w-2xl mx-auto bg-card text-card-foreground border border-border rounded-2xl shadow-sm p-6">
                        <h2 className="text-lg font-bold text-foreground">
                          Start a conversation
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ask a question or paste content you want help with.
                        </p>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            "Summarize this article for me in 5 bullet points.",
                            "Rewrite this paragraph to be clearer and more concise.",
                            "Give me 10 blog post ideas about sustainable travel.",
                            "Turn these notes into a professional email.",
                          ].map((example) => (
                            <button
                              key={example}
                              type="button"
                              onClick={() => setInput(example)}
                              className="text-left p-3 rounded-xl bg-muted border border-border hover:opacity-90 transition-opacity"
                            >
                              <div className="text-xs font-medium text-muted-foreground">
                                Try this
                              </div>
                              <div className="text-sm text-foreground mt-1">
                                {example}
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
                          <Link
                            href={ROUTES.tools}
                            className="inline-flex items-center justify-center px-5 py-2.5 bg-card text-foreground rounded-xl border border-border hover:opacity-90 transition-opacity"
                          >
                            Explore tools
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setInput("Help me write a blog post outline about:")
                            }
                            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
                          >
                            Get started
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {reversedChatlist.length > MAX_VISIBLE_CHATS && (
                    <div className="flex justify-center mb-4">
                      <span className="text-xs text-muted-foreground">
                        Showing the most recent {MAX_VISIBLE_CHATS} messages.
                        Load older messages to view more.
                      </span>
                    </div>
                  )}
                  {visibleChatlist.map((chat) => (
                    <div key={chat.id} className="flex flex-col">
                      <ChatMessage
                        message={chat}
                        profilePhoto={profilePhotoUrl}
                        isUser={true}
                      />
                      <ChatMessage
                        message={chat}
                        profilePhoto={profilePhotoUrl}
                        isUser={false}
                      />
                    </div>
                  ))}

                  {/* Show pending user message and streaming response */}
                  {isLoading && streamingUserText && (
                    <div className="flex flex-col">
                      {/* User's pending message */}
                      <ChatMessage
                        message={{
                          id: "pending",
                          prompt: streamingUserText,
                          response: "",
                          seconds: Math.floor(Date.now() / 1000),
                        }}
                        profilePhoto={profilePhotoUrl}
                        isUser={true}
                      />
                      {/* AI streaming response */}
                      <StreamingResponse content={streamingAssistantText} />
                    </div>
                  )}
                </div>
                <div ref={scrollRef} className="h-1" />
              </div>
            </ScrollToBottom>
          </div>

          <div className="shrink-0 z-20 w-full">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSendPrompt}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}

function getMessageText(message: {
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}) {
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
