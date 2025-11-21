import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { PulseLoader } from "react-spinners";
import { copyToClipboard } from "../utils/copyToClipboard";
import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import { generateResponse } from "@/actions/generateResponse";
import { readStreamableValue } from '@ai-sdk/rsc';
import { toast } from "react-hot-toast"; // For notifications
import { checkRestrictedWords, isIOSReactNativeWebView } from "@/utils/platform";

interface GenericPromptProps {
  title: string;
  systemPrompt: string;
  promptPrefix: string;
  inputLabel: string;
  inputPlaceholder: string;
  isTextArea?: boolean;
}

export default function GenericPrompt({
  title,
  systemPrompt,
  promptPrefix,
  inputLabel,
  inputPlaceholder,
  isTextArea = false,
}: GenericPromptProps) {
  const uid = useAuthStore((state) => state.uid);

  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [thinking, setThinking] = useState<boolean>(false);

  const [topic, setTopic] = useState<string>("");
  const [words, setWords] = useState<string>("30");

  async function saveHistory(
    prompt: string,
    response: string,
    topic: string,
    words: string,
    xrefs: string[]
  ) {
    if (uid) {
      const docRef = doc(collection(db, "users", uid, "summaries"));
      await setDoc(docRef, {
        id: docRef.id,
        prompt,
        response,
        topic,
        xrefs,
        words,
        timestamp: Timestamp.now(),
      });
    }
  }

  const getResponse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isIOSReactNativeWebView() && checkRestrictedWords(topic)) {
      alert(
        "Your description contains restricted words and cannot be used."
      );
      return;
    }
    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);

    let wordnum = Number(words || "30");
    if (wordnum < 3) wordnum = 3;
    if (wordnum > 800) wordnum = 800;

    const newPrompt = `${promptPrefix} in approximately ${wordnum} words: ${topic}`;
    console.log("newPrompt", newPrompt);

    let finishedSummary = "";
    try {
      const result = await generateResponse(systemPrompt, newPrompt);
      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          setSummary(finishedSummary);
        }
      }
      setThinking(false);
      setPrompt(newPrompt);

      await saveHistory(newPrompt, finishedSummary, topic, words, []);
      toast.success(`${title} generated successfully`);
    } catch (error) {
      setThinking(false);
      setFlagged(
        "No suggestions found. Servers might be overloaded right now."
      );
      console.error("Error generating response:", error);
      toast.error(`Failed to generate ${title}`);
    }
  };

  useEffect(() => {
    if (summary) {
      document
        .getElementById("response")
        ?.scrollIntoView({ behavior: "smooth" });
    } else if (prompt) {
      document.getElementById("prompt")?.scrollIntoView({ behavior: "smooth" });
    } else if (flagged) {
      document
        .getElementById("flagged")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  }, [summary, prompt, flagged]);

  return (
    <div className="form-wrapper">
      <form onSubmit={(e) => getResponse(e)}>
        <label htmlFor="topic-field" className="text-[#041D34] font-semibold">
          {inputLabel}
          {isTextArea ? (
            <textarea
              className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border#ECECEC] font-normal placeholder:text-[#BBBEC9]"
              id="topic-field"
              rows={4}
              placeholder={inputPlaceholder}
              onChange={(e) => setTopic(e.target.value)}
            />
          ) : (
            <input
              type="text"
              id="topic-field"
              maxLength={120}
              placeholder={inputPlaceholder}
              onChange={(e) => setTopic(e.target.value)}
            />
          )}
        </label>

        <label htmlFor="words-field" className="text-[#041D34] font-semibold">
          Approximate number of words (Between 3 and 800)
          <input
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border#ECECEC] font-normal placeholder:text-[#BBBEC9]"
            defaultValue={"30"}
            type="number"
            id="words-field"
            placeholder="Enter number of words."
            onChange={(e) => setWords(e.target.value || "30")}
          />
        </label>
        <button
          className={`w-full mt-6 py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center ${
            active
              ? "bg-[#192449] text-white hover:bg-[#263566]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          type="submit"
          disabled={!active}
        >
          {thinking ? (
            <div className="flex items-center gap-2">
              <span>Writing</span>
              <PulseLoader color="#fff" size={6} />
            </div>
          ) : (
            "Let's Write!"
          )}
        </button>
        {Boolean(flagged) && <h3 id="flagged">{flagged}</h3>}

        {!Boolean(flagged) && Boolean(summary) && (
          <div id="response">
            <h3
              className="cursor-pointer response bg-[#E7EAEF] text-[#0B3C68]"
              onClick={() => copyToClipboard(summary)}
            >
              {summary}
            </h3>
          </div>
        )}
      </form>
    </div>
  );
}
