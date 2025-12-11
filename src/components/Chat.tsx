"use client";

import { useRef, useMemo } from "react";
import { useAuthStore } from "@/zustand/useAuthStore";
import ScrollToBottom from "react-scroll-to-bottom";
import useProfileStore from "@/zustand/useProfileStore";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useChatGeneration } from "@/hooks/useChatGeneration";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import StreamingResponse from "@/components/StreamingResponse";
import { LoadingSpinner, InlineSpinner } from "@/components/ui/LoadingSpinner";

export default function Chat() {
  const uid = useAuthStore((s) => s.uid);
  const profile = useProfileStore((s) => s.profile);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const {
    chatlist,
    loading,
    loadingMore,
    lastKey,
    loadMoreChats,
    markResponseSaved,
  } = useChatMessages(uid);

  const {
    newPrompt,
    setNewPrompt,
    pendingPrompt,
    streamedResponse,
    loadingResponse,
    handleSendPrompt,
  } = useChatGeneration(uid, chatlist, markResponseSaved, scrollToBottom);

  // Memoize reversed chat list to avoid recalculating on every render
  const reversedChatlist = useMemo(
    () => chatlist.slice().reverse(),
    [chatlist]
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] relative bg-gray-50/30 w-full">
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
                  {reversedChatlist.map((chat, index) => (
                    <div key={index} className="flex flex-col">
                      <ChatMessage
                        message={chat}
                        profilePhoto={profile.photoUrl}
                        isUser={true}
                      />
                      <ChatMessage
                        message={chat}
                        profilePhoto={profile.photoUrl}
                        isUser={false}
                      />
                    </div>
                  ))}

                  {/* Show pending user message and streaming response */}
                  {loadingResponse && pendingPrompt && (
                    <div className="flex flex-col">
                      {/* User's pending message */}
                      <ChatMessage
                        message={{
                          id: "pending",
                          prompt: pendingPrompt,
                          response: "",
                          seconds: Math.floor(Date.now() / 1000),
                        }}
                        profilePhoto={profile.photoUrl}
                        isUser={true}
                      />
                      {/* AI streaming response */}
                      <StreamingResponse content={streamedResponse} />
                    </div>
                  )}
                </div>
                <div ref={scrollRef} className="h-1" />
              </div>
            </ScrollToBottom>
          </div>

          <div className="shrink-0 z-20 w-full">
            <ChatInput
              value={newPrompt}
              onChange={setNewPrompt}
              onSubmit={handleSendPrompt}
              isLoading={loadingResponse}
            />
          </div>
        </>
      )}
    </div>
  );
}
