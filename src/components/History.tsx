"use client";

import {
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Copy,
  Download,
} from "lucide-react";
import { useState, useCallback } from "react";

import { useAuthStore } from "@/zustand/useAuthStore";
import { UserHistoryType } from "@/types/UserHistoryType";
import { copyImageToClipboard, downloadImage } from "@/utils/clipboard";
import Image from "next/image";
import MarkdownRenderer from "./MarkdownRenderer";
import { LoadingSpinner, InlineSpinner } from "@/components/ui/LoadingSpinner";
import { CopyButton } from "@/components/ui/CopyButton";
import { useFirestorePagination } from "@/hooks/useFirestorePagination";

export default function History() {
  const uid = useAuthStore((state) => state.uid);
  const [search, setSearch] = useState<string>("");

  // Track collapsed/expanded state for each history item
  const [expandedItems, setExpandedItems] = useState<{
    [key: number]: boolean;
  }>({});

  // Transform function for Firestore documents
  const transformHistoryDoc = useCallback(
    (doc: { data: () => Record<string, unknown> }): UserHistoryType => {
      const d = doc.data();
      return {
        id: d.id as string,
        prompt: d.prompt as string,
        response: d.response as string,
        timestamp: d.timestamp as UserHistoryType["timestamp"],
        topic: d.topic as string,
        words: d.words as string,
        xrefs: d.xrefs as string[],
      };
    },
    []
  );

  const {
    items: summaries,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useFirestorePagination<UserHistoryType>({
    uid,
    collectionName: "summaries",
    pageSize: 20,
    transform: transformHistoryDoc,
  });

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (!uid)
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <p className="text-gray-500">Please sign in to view your history.</p>
      </div>
    );

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] relative bg-gray-50/30 w-full">
      <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-4 pb-8 pt-4">
        <div className="max-w-4xl mx-auto h-full">
          <div className="w-full py-6 mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#041D34]">History</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Your past conversations
                </p>
              </div>
              <div className="relative group w-full md:w-auto md:min-w-[300px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm hover:shadow-md"
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <LoadingSpinner size="lg" text="Loading history..." />
            </div>
          ) : (
            <div className="flex flex-col space-y-6">
              {summaries
                .filter((summary) =>
                  (summary.response + " " + summary.prompt)
                    .toUpperCase()
                    .includes(search ? search.toUpperCase() : "")
                )
                .map((summary, index) => (
                  <div
                    key={index}
                    className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md"
                  >
                    <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <Calendar size={14} />
                        {new Date(
                          summary.timestamp.seconds * 1000
                        ).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                      <button
                        onClick={() => toggleExpand(index)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        {expandedItems[index] ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    </div>

                    <div className="p-5 space-y-6">
                      {/* User Prompt */}
                      <div className="flex w-full justify-end">
                        <div className="flex max-w-[90%] md:max-w-[80%] gap-3 items-start flex-row-reverse">
                          <div className="flex flex-col items-end w-full">
                            <div
                              className={`px-5 py-3.5 bg-[#2563EB] text-white rounded-2xl rounded-tr-sm shadow-sm text-left transition-all duration-300 w-full ${
                                expandedItems[index]
                                  ? ""
                                  : "max-h-32 overflow-y-hidden relative"
                              }`}
                            >
                              <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed break-all">
                                {summary.prompt}
                              </p>
                              {!expandedItems[index] && (
                                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#2563EB] to-transparent pointer-events-none rounded-b-2xl"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bot Response */}
                      <div className="flex w-full justify-start">
                        <div className="flex max-w-[100%] gap-4 items-start">
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-6 py-5 shadow-sm text-gray-800 relative group">
                              <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2">
                                <span className="font-semibold text-sm text-gray-900">
                                  XREF.AI
                                </span>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] text-white">
                                  Bot
                                </span>
                              </div>

                              {summary.words === "image" ? (
                                <div className="space-y-4">
                                  <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                    <Image
                                      src={summary.response}
                                      alt="Generated Image"
                                      width={512}
                                      height={512}
                                      className="w-full h-auto object-cover"
                                      unoptimized
                                    />
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() =>
                                        copyImageToClipboard(summary.response)
                                      }
                                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                    >
                                      <Copy size={14} /> Copy URL
                                    </button>
                                    <button
                                      onClick={() =>
                                        downloadImage(summary.response)
                                      }
                                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                    >
                                      <Download size={14} /> Download
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={`prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:p-0 transition-all duration-300 break-words ${
                                    expandedItems[index]
                                      ? ""
                                      : "max-h-60 overflow-y-hidden relative"
                                  }`}
                                >
                                  <MarkdownRenderer
                                    content={summary.response}
                                  />
                                  {!expandedItems[index] && (
                                    <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                  )}
                                </div>
                              )}

                              {summary.words !== "image" && (
                                <div className="mt-4 flex justify-start pt-3 border-t border-gray-50">
                                  <CopyButton text={summary.response} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!expandedItems[index] && (
                      <button
                        onClick={() => toggleExpand(index)}
                        className="w-full py-3 text-xs font-medium text-gray-500 hover:text-[#2563EB] hover:bg-gray-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1"
                      >
                        Show full conversation <ChevronDown size={14} />
                      </button>
                    )}
                  </div>
                ))}

              {!loading && summaries.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
                  <p>No history found.</p>
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center pt-4 pb-8">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-sm font-medium text-[#192449] hover:text-blue-700 bg-white border border-gray-200 hover:bg-gray-50 px-6 py-3 rounded-full transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer hover:shadow-md"
                  >
                    {loadingMore && <InlineSpinner size="sm" />}
                    {loadingMore
                      ? "Loading older history..."
                      : "Load older history"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
