"use client";

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
import { copyToClipboard } from "@/utils/copyToClipboard";
import Image from "next/image"; // Import the Image component from Next.js

export default function History() {
  const uid = useAuthStore((state) => state.uid);
  const [summaries, setSummaries] = useState<UserHistoryType[]>([]);
  const [search, setSearch] = useState<string>("");
  const [lastKey, setLastKey] = useState<Timestamp | undefined>(undefined);

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

                <div className="whitespace-pre-wrap">{summary.prompt}</div>
                {summary.words === "image" ? (
                  <div>
                    <a href={summary.response} target="_blank" rel="noreferrer">
                      {/* Use Image component from Next.js */}
                      <Image
                        src={summary.response}
                        alt="Generated Image"
                        width={512} // Specify width based on your layout
                        height={512} // Specify height based on your layout
                        className="displayImage"
                      />
                    </a>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer response"
                    onClick={() => copyToClipboard(summary.response)}
                  >
                    {summary.response}
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
