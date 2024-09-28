"use client";

import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import toast from "react-hot-toast";
import { UserHistoryType } from "@/types/UserHistoryType";
import { copyToClipboard } from "@/utils/copyToClipboard"; // Assuming you have this utility
import Image from "next/image"; // Import the Image component from Next.js

export default function History() {
  const uid = useAuthStore((state) => state.uid);
  const [summaries, setSummaries] = useState<UserHistoryType[]>([]);
  const [search, setSearch] = useState<string>("");
  const [lastKey, setLastKey] = useState<Timestamp | undefined>(undefined);

  // Track collapsed/expanded state for each prompt and response
  const [expandedPrompts, setExpandedPrompts] = useState<{
    [key: number]: boolean;
  }>({});
  const [expandedResponses, setExpandedResponses] = useState<{
    [key: number]: boolean;
  }>({});

  // Toggle expansion for prompts
  const togglePromptExpand = (index: number) => {
    setExpandedPrompts((prev) => ({
      ...prev,
      [index]: !prev[index], // Toggle the specific index
    }));
  };

  // Toggle expansion for responses
  const toggleResponseExpand = (index: number) => {
    setExpandedResponses((prev) => ({
      ...prev,
      [index]: !prev[index], // Toggle the specific index
    }));
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    const getData = async () => {
      if (uid) {
        const c = collection(db, "users", uid, "summaries");
        const q = query(c, orderBy("timestamp", "desc"), limit(100));
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
      }
    };
    getData();
  }, [uid]);

  const postsNextBatch = async (key: Timestamp) => {
    if (uid) {
      const toastId = toast.loading("Loading history...");
      const c = collection(db, "users", uid, "summaries");
      const q = query(
        c,
        orderBy("timestamp", "desc"),
        startAfter(key),
        limit(100)
      );
      const querySnapshot = await getDocs(q);
      const s: UserHistoryType[] = summaries;
      let lastKey: Timestamp | undefined;
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

      toast.dismiss(toastId);
      toast.success("History loaded successfully");

      setSummaries(s);
      setLastKey(lastKey);
    }
  };

  if (!uid) return <div>Not signed in</div>;

  return (
    <div className="flex flex-col space-y-5">
      <input
        className="px-3 py-2 border rounded-md outline-none"
        type="text"
        placeholder="Filter results..."
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-col space-y-5">
        {orderedSummaries &&
          orderedSummaries
            .filter((summary) =>
              (summary.response + " " + summary.prompt)
                .toUpperCase()
                .includes(search ? search.toUpperCase() : "")
            )
            .map((summary, index) => (
              <div key={index} className="p-3 rounded-md shadow-md">
                <div>
                  {new Date(summary.timestamp.seconds * 1000).toLocaleString()}
                </div>

                {/* Collapsible prompt */}
                <div
                  className={`whitespace-pre-wrap cursor-pointer mt-2 transition-all duration-300 ease-in-out ${
                    expandedPrompts[index]
                      ? "max-h-full"
                      : "max-h-16 overflow-hidden"
                  }`}
                  onClick={() => togglePromptExpand(index)}
                >
                  {summary.prompt}
                  {expandedPrompts[index] ? (
                    <ChevronUp className="inline-block ml-2" />
                  ) : (
                    <ChevronDown className="inline-block ml-2" />
                  )}
                </div>

                {/* Collapsible response with bg-orange-200 */}
                {summary.words === "image" ? (
                  <div className="mt-2">
                    <a href={summary.response} target="_blank" rel="noreferrer">
                      <Image
                        src={summary.response}
                        alt="Generated Image"
                        width={512}
                        height={512}
                        className="displayImage"
                      />
                    </a>
                  </div>
                ) : (
                  <div className="relative mt-2">
                    <div
                      className={`whitespace-pre-wrap cursor-pointer bg-orange-200 p-2 rounded-md transition-all duration-300 ease-in-out ${
                        expandedResponses[index]
                          ? "max-h-full"
                          : "max-h-16 overflow-hidden"
                      }`}
                      onClick={() => toggleResponseExpand(index)}
                    >
                      {summary.response}
                      {expandedResponses[index] ? (
                        <ChevronUp className="inline-block ml-2" />
                      ) : (
                        <ChevronDown className="inline-block ml-2" />
                      )}
                    </div>
                    {/* Copy to clipboard button */}
                    <button
                      onClick={() => copyToClipboard(summary.response)}
                      className="absolute top-0 right-0"
                      title="Copy to Clipboard"
                    >
                      <Copy className="text-gray-500 hover:text-gray-800" />
                    </button>
                  </div>
                )}
              </div>
            ))}
      </div>
      {lastKey && (
        <button onClick={() => postsNextBatch(lastKey)}>Load More</button>
      )}
    </div>
  );
}
