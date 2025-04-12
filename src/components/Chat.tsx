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

export default function Chat() {
  const uid = useAuthStore((s) => s.uid);
  const profile = useProfileStore((s) => s.profile);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Simple scroll to bottom function
  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="relative flex flex-col items-center container mx-auto justify-center p-0 space-y-5 sm:p-5 sm:pb-0">
      {/* Load more button if needed */}
      {lastKey && (
        <button
          onClick={loadMoreChats}
          disabled={loadingMore}
          className="w-44 text-white px-3 py-2 custom-write bottom bg-[#192449] opacity-100! hover:bg-[#83A873] rounded-3xl! font-bold transition-transform duration-300 ease-in-out"
        >
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      )}

      {loading ? (
        <div className="flex items-center justify-center w-full h-full">
          <p>Loading chat...</p>
        </div>
      ) : (
        <div className="flex flex-col w-full h-full space-y-4 chat-bord-main">
          <div className="relative">
            <ScrollToBottom
              className="scroll-to-bottom"
              initialScrollBehavior="smooth"
              followButtonClassName="hidden" // Hide the default button
            >
              <div className="flex flex-col">
                {/* Display chat list */}
                {chatlist
                  .slice()
                  .reverse()
                  .map((chat, index) => (
                    <div key={index} className="flex flex-col my-3 space-y-3">
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
                  <StreamingResponse content={streamedResponse} />
                )}
              </div>
              <div ref={scrollRef} style={{ height: 1 }} />
            </ScrollToBottom>
          </div>

          <div className="sticky bottom-0 rounded-md">
            <ChatInput
              value={newPrompt}
              onChange={setNewPrompt}
              onSubmit={handleSendPrompt}
              isLoading={loadingResponse}
            />
          </div>
        </div>
      )}

      {/* Manual scroll button */}
      <button
        onClick={scrollToBottom}
        className="cursor-pointer fixed z-40 rounded-full bg-[#02C173]
          right-6 bottom-48 
          text-white w-12 h-12 flex items-center justify-center 
          shadow-md hover:bg-[#01a862] transition-colors"
        aria-label="Scroll to bottom"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </button>
    </div>
  );
}
