"use client";

import { ChevronDown, ChevronUp, Search, Calendar, Copy, Check, Download, User, Loader2 } from "lucide-react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useState, useRef } from "react";

import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import toast from "react-hot-toast";
import { UserHistoryType } from "@/types/UserHistoryType";
import { copyToClipboard } from "@/utils/copyToClipboard";
import Image from "next/image";
import { copyImageToClipboard, downloadImage } from "@/utils/helpers";
import MarkdownRenderer from "./MarkdownRenderer";
import useProfileStore from "@/zustand/useProfileStore";

export default function History() {
  const uid = useAuthStore((state) => state.uid);
  const [summaries, setSummaries] = useState<UserHistoryType[]>([]);
  const [search, setSearch] = useState<string>("");
  const [lastKey, setLastKey] = useState<Timestamp | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const profile = useProfileStore((s) => s.profile);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track collapsed/expanded state for each history item
  const [expandedItems, setExpandedItems] = useState<{ [key: number]: boolean }>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopy = async (text: string, index: number) => {
    await copyToClipboard(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const orderedSummaries = summaries
    .slice()
    .sort((a, b) =>
      b.timestamp.seconds > a.timestamp.seconds
        ? 1
        : b.timestamp.seconds < a.timestamp.seconds
        ? -1
        : 0
    );

  useEffect(() => {
    // Initial load
    const getData = async () => {
      if (uid) {
        setLoading(true);
        try {
          const c = collection(db, "users", uid, "summaries");
          const q = query(c, orderBy("timestamp", "desc"), limit(20));
          const querySnapshot = await getDocs(q);

          const s: UserHistoryType[] = [];
          let lastKey: Timestamp | undefined = undefined;
          querySnapshot.forEach((doc) => {
            const d = doc.data();

            s.push({
              id: d.id,
              prompt: d.prompt,
              response: d.response,
              timestamp: d.timestamp,
              topic: d.topic,
              words: d.words,
              xrefs: d.xrefs,
            });
            lastKey = doc.data().timestamp;
          });

          setSummaries(s);
          setLastKey(lastKey);
        } catch (error) {
          console.error("Error fetching history:", error);
          toast.error("Failed to load history");
        } finally {
          setLoading(false);
        }
      }
    };
    getData();
  }, [uid]);

  const postsNextBatch = async (key: Timestamp) => {
    if (uid) {
      setLoadingMore(true);
      try {
        const c = collection(db, "users", uid, "summaries");
        const q = query(
          c,
          orderBy("timestamp", "desc"),
          startAfter(key),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const s: UserHistoryType[] = [...summaries]; // Create a copy
        let newLastKey: Timestamp | undefined;
        querySnapshot.forEach((doc) => {
          const d = doc.data();
          s.push({
            id: d.id,
            prompt: d.prompt,
            response: d.response,
            timestamp: d.timestamp,
            topic: d.topic,
            words: d.words,
            xrefs: d.xrefs,
          });
          newLastKey = doc.data().timestamp;
        });

        setSummaries(s);
        setLastKey(newLastKey);
      } catch (error) {
        console.error("Error fetching more history:", error);
        toast.error("Failed to load more items");
      } finally {
        setLoadingMore(false);
      }
    }
  };

  if (!uid) return (
    <div className="flex items-center justify-center h-[calc(100vh-80px)]">
      <p className="text-gray-500">Please sign in to view your history.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] relative bg-gray-50/30 w-full">
      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-4 pb-8 pt-4">
        <div className="max-w-4xl mx-auto h-full">
           
           {/* Header Section - Now inside scroll area */}
           <div className="w-full py-6 mb-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#041D34]">History</h1>
                  <p className="text-sm text-gray-500 mt-1">Your past conversations</p>
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
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Loader2 size={32} className="animate-spin text-[#192449] mb-4" />
              <p>Loading history...</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-6">
              {orderedSummaries &&
                orderedSummaries
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
                      {/* Header with Date */}
                      <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            <Calendar size={14} />
                            {new Date(summary.timestamp.seconds * 1000).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                        </div>
                        <button 
                          onClick={() => toggleExpand(index)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          {expandedItems[index] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                      <div className="p-5 space-y-6">
                        {/* User Prompt */}
                        <div className="flex w-full justify-end">
                          <div className="flex max-w-[90%] md:max-w-[80%] gap-3 items-start flex-row-reverse">
                            <div className="flex flex-col items-end w-full">
                              <div className={`px-5 py-3.5 bg-[#2563EB] text-white rounded-2xl rounded-tr-sm shadow-sm text-left transition-all duration-300 w-full ${expandedItems[index] ? '' : 'max-h-32 overflow-y-hidden relative'}`}>
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
                                    <span className="font-semibold text-sm text-gray-900">XREF.AI</span>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] text-white">
                                    Bot
                                    </span>
                                </div>
                                
                                {/* Content */}
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
                                        onClick={() => copyImageToClipboard(summary.response)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                      >
                                        <Copy size={14} /> Copy URL
                                      </button>
                                      <button
                                        onClick={() => downloadImage(summary.response)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                      >
                                        <Download size={14} /> Download
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:p-0 transition-all duration-300 break-words ${expandedItems[index] ? '' : 'max-h-60 overflow-y-hidden relative'}`}>
                                    <MarkdownRenderer content={summary.response} />
                                    {!expandedItems[index] && (
                                      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Action Buttons (Copy, etc) */}
                                {summary.words !== "image" && (
                                  <div className="mt-4 flex justify-start pt-3 border-t border-gray-50">
                                    <button
                                      onClick={() => handleCopy(summary.response, index)}
                                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                                    >
                                      {copiedIndex === index ? (
                                        <>
                                          <Check size={14} className="text-green-600" />
                                          <span className="text-green-600">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={14} />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}

                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Show More / Less Button if condensed */}
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
              
              {!loading && orderedSummaries.length === 0 && (
                  <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
                      <p>No history found.</p>
                  </div>
              )}

              {lastKey && (
                <div className="flex justify-center pt-4 pb-8">
                  <button
                    onClick={() => postsNextBatch(lastKey)}
                    disabled={loadingMore}
                    className="text-sm font-medium text-[#192449] hover:text-blue-700 bg-white border border-gray-200 hover:bg-gray-50 px-6 py-3 rounded-full transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer hover:shadow-md"
                  >
                    {loadingMore && <Loader2 size={14} className="animate-spin" />}
                    {loadingMore ? "Loading older history..." : "Load older history"}
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
