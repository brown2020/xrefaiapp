import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { PulseLoader } from "react-spinners";
import { copyToClipboard } from "../utils/copyToClipboard";
import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import { generateResponse } from "@/actions/generateResponse";
import { readStreamableValue } from "ai/rsc";
import { toast } from "react-hot-toast"; // For notifications

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
        <label htmlFor="topic-field">
          {inputLabel}
          {isTextArea ? (
            <textarea
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

        <label htmlFor="words-field">
          Approximate number of words (Between 3 and 800)
          <input
            defaultValue={"30"}
            type="number"
            id="words-field"
            placeholder="Enter number of words."
            onChange={(e) => setWords(e.target.value || "30")}
          />
        </label>

        <button className="w-36 bottom" type="submit" disabled={!active}>
          {thinking ? <PulseLoader color="#fff" size={8} /> : "Let's Write!"}
        </button>

        {Boolean(flagged) && <h3 id="flagged">{flagged}</h3>}

        {!Boolean(flagged) && Boolean(summary) && (
          <div id="response">
            <h3
              className="cursor-pointer response"
              onClick={() => copyToClipboard(summary)}
            >
              {summary}
            </h3>
            <p className="disclaimer">
              <span>*</span>
              {`I'm a new AI and I'm still learning, so these results might have inaccuracies.`}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
