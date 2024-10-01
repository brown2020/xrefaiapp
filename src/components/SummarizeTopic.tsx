import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { PulseLoader } from "react-spinners";
import { copyToClipboard } from "../utils/copyToClipboard";
import { db } from "@/firebase/firebaseClient";
import { useAuthStore } from "@/zustand/useAuthStore";
import { generateResponse } from "@/actions/generateResponse";
import { readStreamableValue } from "ai/rsc";
import axios from "axios"; // Import axios for web scraping
import { load } from "cheerio"; // Import cheerio for scraping
import { toast } from "react-hot-toast"; // Import react-hot-toast for notifications

export default function SummarizeTopic() {
  const uid = useAuthStore((state) => state.uid);

  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [thinking, setThinking] = useState<boolean>(false);

  const [topic, setTopic] = useState<string>("");
  const [site1, setSite1] = useState<string>("");
  const [words, setWords] = useState<string>("30");
  const [progress, setProgress] = useState<number>(0); // State for progress

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

  const scrapeWebsite = async (url: string) => {
    try {
      console.log("Starting website scrape for:", url); // Log the URL being scraped
      setProgress(20); // Start progress for scraping

      // Make sure the URL is being passed correctly
      const encodedUrl = encodeURIComponent(url);
      console.log("Encoded URL:", encodedUrl);

      const response = await axios.get(`/api/proxy?url=${encodedUrl}`);

      // Log the response from the proxy to ensure the request is going through
      console.log("Received response from proxy:", response);

      setProgress(50); // Progress after successful scraping

      const html = response.data;
      console.log("HTML content received:", html); // Log the HTML content to ensure it's retrieved correctly

      const $ = load(html);
      const scrapedContent = $("body").text().replace(/\s+/g, " ").trim();

      console.log("Scraped content:", scrapedContent); // Log the final scraped content
      return scrapedContent;
    } catch (err) {
      console.error("Error scraping website:", err);
      toast.error("Failed to scrape website");
      return "";
    }
  };

  const getResponse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);
    setProgress(0); // Reset progress

    let wordnum = Number(words || "30");
    if (wordnum < 3) wordnum = 3;
    if (wordnum > 800) wordnum = 800;

    let newPrompt = "Summarize this topic";
    let scrapedContent = "";

    if (site1) {
      scrapedContent = await scrapeWebsite(site1);
      if (scrapedContent) {
        newPrompt += ` based on the content from the website ${site1}`;
        newPrompt += ` in approximately ${wordnum} words: ${scrapedContent}`;
      } else {
        newPrompt += ` in approximately ${wordnum} words: ${topic}`;
      }
    } else {
      newPrompt += ` in approximately ${wordnum} words: ${topic}`;
    }

    console.log("newPrompt", newPrompt);
    const systemPrompt = "Summarize this topic";
    let finishedSummary = "";

    try {
      const result = await generateResponse(systemPrompt, newPrompt);
      let chunkCount = 0; // Initialize chunk counter
      for await (const content of readStreamableValue(result)) {
        if (content) {
          finishedSummary = content.trim();
          setSummary(finishedSummary);
          chunkCount++;
          setProgress(70 + (chunkCount / wordnum) * 30); // Update progress bar during summarizing
        }
      }

      setThinking(false);
      setPrompt(newPrompt);

      await saveHistory(newPrompt, finishedSummary, topic, words, []);
      toast.success("Summary generated successfully");
    } catch (error: unknown) {
      setThinking(false);
      setFlagged(
        "No suggestions found. Servers might be overloaded right now."
      );
      console.error("Error generating response:", error);
      toast.error("Failed to generate summary");
    } finally {
      setProgress(100); // Complete progress
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
          Topic
          <input
            type="text"
            id="topic-field"
            maxLength={80}
            placeholder="Enter a topic to write about."
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>

        <label htmlFor="site1-field">
          Website reference
          <input
            type="text"
            id="site1-field"
            maxLength={120}
            placeholder="Website URL to use as a reference."
            onChange={(e) => {
              setSite1(e.target.value);
            }}
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

        {thinking && <div>Progress: {progress}%</div>}

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
