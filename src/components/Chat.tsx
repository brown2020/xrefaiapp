"use client";

import { useRef } from "react";
import { useAuthStore } from "@/zustand/useAuthStore";
import ScrollToBottom from "react-scroll-to-bottom";
import useProfileStore from "@/zustand/useProfileStore";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useChatGeneration } from "@/hooks/useChatGeneration";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import StreamingResponse from "@/components/StreamingResponse";
import { Loader2 } from "lucide-react";

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
    streamedResponse,
    loadingResponse,
    handleSendPrompt,
  } = useChatGeneration(uid, chatlist, markResponseSaved, scrollToBottom);

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] relative bg-gray-50/30 w-full">
      {loading ? (
        <div className="flex flex-1 items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2 size={32} className="animate-spin text-[#192449]" />
            <p className="font-medium">Loading your conversation...</p>
          </div>
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
                      {loadingMore && (
                        <Loader2 size={12} className="animate-spin" />
                      )}
                      {loadingMore
                        ? "Loading older messages..."
                        : "Load older messages"}
                    </button>
                  </div>
                )}

                {/* Chat List */}
                <div className="flex flex-col space-y-2">
                  {chatlist
                    .slice()
                    .reverse()
                    .map((chat, index) => (
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

                  {loadingResponse && (
                    <div className="flex flex-col">
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
