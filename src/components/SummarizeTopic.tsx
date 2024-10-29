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
      {!thinking && !Boolean(prompt) && (
        <h3 className="text-4xl sm:text-4xl md:text-4xl chnage_title font-extrabold my-2 text-center"><span className="bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] bg-clip-text text-transparent">What would you like to write about today?</span></h3>
      )}
      <form onSubmit={(e) => getResponse(e)}>
        <label htmlFor="topic-field" className="text-[#041D34] font-semibold">
          Topic
          <input
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5]"
            type="text"
            id="topic-field"
            maxLength={80}
            placeholder="Enter a topic to write about."
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>

        <label htmlFor="site1-field" className="text-[#041D34] font-semibold">
          Website reference
          <input
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5]"
            type="text"
            id="site1-field"
            maxLength={120}
            placeholder="Website URL to use as a reference."
            onChange={(e) => {
              setSite1(e.target.value);
            }}
          />
        </label>

        <label htmlFor="words-field" className="text-[#041D34] font-semibold">
          Approximate number of words (Between 3 and 800)
          <input
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5]"
            defaultValue={"30"}
            type="number"
            id="words-field"
            placeholder="Enter number of words."
            onChange={(e) => setWords(e.target.value || "30")}
          />
        </label>
        <div className="sm:flex sm:flex-row-reverse flex flex-col-reverse gap-4 sm:justify-end items-center !mt-[2rem]">
          <div className="w-[100%] sm:w-[30%] text-center sm:text-start">
            <button className="w-44 text-white px-3 py-2 custom-write bottom bg-[#192449] !opacity-100 hover:bg-[#83A873] !rounded-3xl font-bold transition-transform duration-300 ease-in-out" type="submit" disabled={!active}>
              <span className="text-white">{thinking ? <PulseLoader color="#fff" size={8} /> : "Let's Write!"}</span>
            </button>
          </div>
          <div className="w-[100%] sm:w-[40%] progress-main">
            {thinking && <div className="w-full bg-gray-200 h-3.5 rounded-full">
              <div className={`bg-[#48B461] text-xs h-3.5 font-medium text-blue-100 text-center p-0.5 leading-none rounded-full Striped-bar`} style={{ width: `${progress}%` }}>  <div className="text-white">{progress}%</div></div>
            </div>}

          </div>
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
            <p className="disclaimer text-[#041D34]">
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
