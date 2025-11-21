import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { PulseLoader } from "react-spinners";
import { copyToClipboard } from "../utils/copyToClipboard";
import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import { generateResponse } from "@/actions/generateResponse";
import { readStreamableValue } from '@ai-sdk/rsc';
import { toast } from "react-hot-toast";
import { checkRestrictedWords, isIOSReactNativeWebView } from "@/utils/platform";
import TextareaAutosize from "react-textarea-autosize";

export default function SummarizeText() {
  const uid = useAuthStore((state) => state.uid);

  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [thinking, setThinking] = useState<boolean>(false);

  const [textToSummarize, setTextToSummarize] = useState<string>("");
  const [words, setWords] = useState<string>("30");
  const [progress, setProgress] = useState<number>(0);

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
    if (isIOSReactNativeWebView() && checkRestrictedWords(textToSummarize)) {
      alert(
        "Your text contains restricted words and cannot be used."
      );
      return;
    }
    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);
    setProgress(0);

    let wordnum = Number(words || "30");
    if (wordnum < 3) wordnum = 3;
    if (wordnum > 800) wordnum = 800;

    // Construct the prompt
    const newPrompt = `Summarize the following text in approximately ${wordnum} words:\n\n${textToSummarize}`;
    const systemPrompt = "Summarize the provided text.";

    console.log("newPrompt", newPrompt);
    let finishedSummary = "";

    try {
      const result = await generateResponse(systemPrompt, newPrompt);
      let chunkCount = 0;
      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          setSummary(finishedSummary);
          chunkCount++;
          // Estimate progress based on expected word count
          const currentProgress = 20 + (chunkCount / wordnum) * 80; 
          setProgress(Math.min(currentProgress, 95));
        }
      }

      setThinking(false);
      setPrompt(newPrompt);

      // Save history - using a truncated version of the text as the "topic" for display purposes
      const topicDisplay = textToSummarize.length > 50 ? textToSummarize.substring(0, 50) + "..." : textToSummarize;
      await saveHistory(newPrompt, finishedSummary, topicDisplay, words, []);
      toast.success("Text summarized successfully");
    } catch (error: unknown) {
      setThinking(false);
      setFlagged(
        "No suggestions found. Servers might be overloaded right now."
      );
      console.error("Error generating response:", error);
      toast.error("Failed to summarize text");
    } finally {
      setProgress(100);
      setActive(true);
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
        <label htmlFor="text-field" className="text-[#041D34] font-semibold">
          Text to Summarize
          <TextareaAutosize
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5] w-full p-3 rounded-md outline-none resize-none"
            id="text-field"
            minRows={4}
            placeholder="Paste the text you want to summarize here."
            onChange={(e) => setTextToSummarize(e.target.value)}
            value={textToSummarize}
            required
          />
        </label>

        <label htmlFor="words-field" className="text-[#041D34] font-semibold">
          Approximate number of words (Between 3 and 800)
          <input
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5] w-full p-3 rounded-md outline-none"
            defaultValue={"30"}
            type="number"
            id="words-field"
            placeholder="Enter number of words."
            onChange={(e) => setWords(e.target.value || "30")}
          />
        </label>

        <div className="mt-6">
          {thinking && (
            <div className="w-full mb-4 bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#48B461] h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          <button
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center ${
              active && textToSummarize.trim()
                ? "bg-[#192449] text-white hover:bg-[#263566]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            type="submit"
            disabled={!active || !textToSummarize.trim()}
          >
            {thinking ? (
              <div className="flex items-center gap-2">
                <span>Summarizing</span>
                <PulseLoader color="#fff" size={6} />
              </div>
            ) : (
              "Summarize Text"
            )}
          </button>
        </div>

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

