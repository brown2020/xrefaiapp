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
import { MAX_WORDS_IN_CONTEXT, MAX_VISIBLE_CHATS } from "@/constants";
import { saveChatServer } from "@/actions/serverHistory";
import { usePaywallStore } from "@/zustand/usePaywallStore";
import { CREDITS_COSTS } from "@/constants/credits";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";
import { getMessageText, calculateWordCount } from "@/utils/messages";
import { isInsufficientCreditsError } from "@/utils/errors";

export default function Chat() {
  const uid = useAuthStore((s) => s.uid);
  const profilePhotoUrl = useProfileStore((s) => s.profile.photoUrl);
  const generationConfig = useProfileStore(
    useShallow((s) => ({
      useCredits: s.profile.useCredits,
      textModel: s.profile.text_model,
      openaiApiKey: s.profile.openai_api_key,
      anthropicApiKey: s.profile.anthropic_api_key,
      xaiApiKey: s.profile.xai_api_key,
      googleApiKey: s.profile.google_api_key,
    }))
  );
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const openPaywall = usePaywallStore((s) => s.openPaywall);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const isSubmittingRef = useRef(false);

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
      const latestUser = [...allMessages]
        .reverse()
        .find((m) => m.role === "user");
      const prompt = latestUser ? getMessageText(latestUser) : "";
      const response = getMessageText(message);

      if (uid && prompt && response) {
        try {
          await saveChatServer(prompt, response);
          markResponseSaved();
          if (generationConfig.useCredits) {
            await fetchProfile();
          }
          // Only clear the streaming messages AFTER the save succeeds so a
          // failed save doesn't drop the message entirely.
          setMessages([]);
        } catch (error) {
          console.error("Failed to save chat:", error);
          toast.error("Message sent but could not be saved to history.");
          // Keep the streaming messages visible so the user can copy/retry.
        }
      } else {
        setMessages([]);
      }
    },
    onError: (error) => {
      if (isInsufficientCreditsError(error)) {
        toast.error("Not enough credits. Please buy more credits in Account.");
        openPaywall({
          actionLabel: "Chat message",
          requiredCredits: CREDITS_COSTS.chatMessage,
          redirectPath: ROUTES.chat,
        });
        return;
      }
      if (
        error instanceof Error &&
        (error.message.includes("CHAT_REQUEST_IN_PROGRESS") ||
          error.message.includes("DUPLICATE_CHAT_REQUEST"))
      ) {
        toast.error(
          "That chat request is already being handled. Please wait a moment."
        );
        return;
      }
      toast.error("Chat request failed. Please try again.");
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  /**
   * Build the conversation history to send to the server, trimmed to the
   * word budget while keeping the MOST RECENT messages (the prior
   * implementation kept the oldest, which dropped recent context).
   * `chatlist` comes newest-first from Firestore; we walk in that order
   * and `unshift` to preserve chronological order.
   */
  const historyForRequest = useMemo(() => {
    const picked: Array<{ prompt: string; response: string }> = [];
    let wordCount = 0;
    for (const chat of chatlist) {
      const words =
        calculateWordCount(chat.prompt) + calculateWordCount(chat.response);
      if (wordCount + words > MAX_WORDS_IN_CONTEXT) break;
      picked.unshift({ prompt: chat.prompt, response: chat.response });
      wordCount += words;
    }
    return picked;
  }, [chatlist]);

  const handleSendPrompt = useCallback(async () => {
    if (isSubmittingRef.current) return;
    if (!input.trim()) return;
    if (!validateContentWithToast(input)) return;

    isSubmittingRef.current = true;
    const inputValue = input.trim();
    setInput("");

    try {
      // Generate a unique client idempotency key so the server can
      // deduplicate retries without blocking legitimate duplicates.
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      await sendMessage(
        { text: inputValue },
        {
          body: {
            history: historyForRequest,
            modelKey: generationConfig.textModel,
            useCredits: generationConfig.useCredits,
            openaiApiKey: generationConfig.openaiApiKey,
            anthropicApiKey: generationConfig.anthropicApiKey,
            xaiApiKey: generationConfig.xaiApiKey,
            googleApiKey: generationConfig.googleApiKey,
            idempotencyKey,
          },
        }
      );
    } finally {
      isSubmittingRef.current = false;
    }
  }, [generationConfig, historyForRequest, input, sendMessage]);

  // Memoize reversed chat list to avoid recalculating on every render.
  const reversedChatlist = useMemo(() => chatlist.slice().reverse(), [chatlist]);
  const visibleChatlist = useMemo(
    () =>
      reversedChatlist.length <= MAX_VISIBLE_CHATS
        ? reversedChatlist
        : reversedChatlist.slice(-MAX_VISIBLE_CHATS),
    [reversedChatlist]
  );

  // Use reverse-iterate `findLast` for O(1) instead of copying + reversing.
  const streamingUserText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return getMessageText(messages[i]);
    }
    return "";
  }, [messages]);

  const streamingAssistantText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return getMessageText(messages[i]);
    }
    return "";
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
                {lastKey && (
                  <div className="flex justify-center mb-8">
                    <button
                      onClick={loadMoreChats}
                      disabled={loadingMore}
                      className="text-xs font-medium text-foreground bg-card border border-border hover:bg-muted px-4 py-2 rounded-full transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loadingMore && <InlineSpinner size="sm" />}
                      {loadingMore
                        ? "Loading older messages..."
                        : "Load older messages"}
                    </button>
                  </div>
                )}

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
                              setInput(
                                "Help me write a blog post outline about:"
                              )
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

                  {isLoading && streamingUserText && (
                    <div className="flex flex-col">
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
