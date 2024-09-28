import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { PulseLoader } from "react-spinners";
import { copyToClipboard } from "../utils/copyToClipboard";
import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import { generateResponse } from "@/actions/generateResponse";
import { readStreamableValue } from "ai/rsc";

export default function FreestylePrompt() {
  const uid = useAuthStore((state) => state.uid);

  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);

  const [topic, setTopic] = useState<string>("");
  const [words, setWords] = useState<string>("");
  const [thinking, setThinking] = useState<boolean>(false);

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

    const newPrompt = `Act as a world class editor, and in approximately ${wordnum} words respond to this prompt: ${topic}`;
    console.log("newPrompt======", newPrompt);
    const systemPrompt = "Summarize this topic";
    let finishedSummary = "";
    try {
      const result = await generateResponse(systemPrompt, newPrompt);
      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          setSummary(finishedSummary); // Directly update state with the latest content chunk
        }
      }
      setThinking(false);
      setPrompt(newPrompt);

      await saveHistory(newPrompt, finishedSummary, topic, words, []);
    } catch (error: unknown) {
      setThinking(false);
      setFlagged(
        "No suggestions found. Servers might be overloaded right now."
      );
      console.error("Error generating response:", error);
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
          Prompt
          <textarea
            id="topic-field"
            rows={4}
            placeholder="Enter a freestyle prompt with any information or questions you want to write about"
            onChange={(e) => setTopic(e.target.value)}
          />
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

        {!thinking && !Boolean(prompt) && (
          <h3>What would you like to write about today?</h3>
        )}

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
              {`I'm a new AI and I'm still learning, so these
              results might have inaccuracies.`}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
