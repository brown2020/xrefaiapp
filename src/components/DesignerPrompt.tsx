import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";

import Select from "react-select";
import { iceCreams } from "../data/iceCreams";
import { candies } from "../data/candies";
import { spices } from "../data/spices";
import { colors } from "../data/colors";
import { painters } from "../data/painters";
import { items } from "../data/items";
import { PulseLoader } from "react-spinners";
import { PromptDataType } from "@/types/PromptDataType";
import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import { getImagePrompt } from "@/utils/getImagePrompt";
import { generateImage } from "@/actions/generateImage";
import toast from "react-hot-toast";
import Image from "next/image";

const initialPrompt: PromptDataType = {
  iceCreams: [],
  toppings: [],
  candies: [],
  flavors: [],
  spices: [],
  colors: [],
  sneakers: [],
  painters: [],
  items: [],
};

export default function DesignerPrompt() {
  const uid = useAuthStore((state) => state.uid);

  const [prompt, setPrompt] = useState("");
  const [promptData, setPromptData] = useState<PromptDataType>(initialPrompt);
  const [summary, setSummary] = useState<string>("");

  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);

  const [topic, setTopic] = useState<string>("");

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);

    const toastId = toast.loading("Working on the design...");
    const prompt = getImagePrompt(promptData, topic);

    const result = await generateImage(prompt, uid);

    setPrompt(prompt);
    setThinking(false);
    console.log("Result from generateImage:", result);

    if (result.imageUrl && uid) {
      try {
        setSummary(result.imageUrl);
        await saveHistory(topic, result.imageUrl, topic, "image", []);

        // Dismiss the loading toast
        toast.dismiss(toastId);

        // Show success toast
        toast.success("History saved!");

        setActive(true);
      } catch (error) {
        console.log("Error while saving history:", error);

        // Dismiss the loading toast
        toast.dismiss(toastId);

        // Show error toast
        toast.error("Error generating design...");

        setActive(true);
      }
    } else {
      setFlagged(
        "I can't do that. I can't do real people or anything that violates the terms of service. Please try changing the prompt."
      );
      console.log("Flagged response:", flagged);

      // Dismiss the loading toast
      toast.dismiss(toastId);

      // Show warning toast
      toast.error("Issue with design...");

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
      <form onSubmit={(e) => handleSubmit(e)}>
        <div>
          <div>Design Category</div>
          <Select
            isClearable={true}
            isSearchable={true}
            name="items"
            onChange={(v) => {
              console.log(v);
              setPromptData({ ...promptData, items: v ? [v.value] : [] });
            }}
            options={items}
          />
        </div>
        <div>
          <div>Artist Inspiration</div>
          <Select
            isClearable={true}
            isSearchable={true}
            name="painters"
            onChange={(v) => {
              console.log(v);
              setPromptData({ ...promptData, painters: v ? [v.value] : [] });
            }}
            options={painters}
          />
        </div>
        <div>
          Here are some other options to try mixing in to sweeten or spice up
          your design. Just try one or two at a time, not too many!
        </div>

        <div>
          <div>Ice Cream Flavor</div>
          <Select
            isClearable={true}
            isSearchable={true}
            name="iceCreams"
            onChange={(v) => {
              console.log(v);
              setPromptData({ ...promptData, iceCreams: v ? [v.value] : [] });
            }}
            options={iceCreams}
          />
        </div>

        <div>
          <div>Candies</div>
          <Select
            isClearable={true}
            isSearchable={true}
            name="candies"
            onChange={(v) => {
              console.log(v);
              setPromptData({ ...promptData, candies: v ? [v.value] : [] });
            }}
            options={candies}
          />
        </div>

        <div>
          <div>Spices</div>
          <Select
            isClearable={true}
            isSearchable={true}
            name="spices"
            onChange={(v) => {
              console.log(v);
              setPromptData({ ...promptData, spices: v ? [v.value] : [] });
            }}
            options={spices}
          />
        </div>
        <div>
          <div>Colors</div>
          <Select
            isClearable={true}
            isSearchable={true}
            name="colors"
            onChange={(v) => {
              console.log(v);
              setPromptData({ ...promptData, colors: v ? [v.value] : [] });
            }}
            options={colors}
          />
        </div>

        <label htmlFor="topic-field">
          Additional Ideas
          <textarea
            id="topic-field"
            rows={4}
            placeholder="Enter a freestyle prompt with any information or ideas you want to visualize"
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>

        <button className="w-36 bottom" type="submit" disabled={!active}>
          {thinking ? (
            <PulseLoader color="#fff" size={8} />
          ) : (
            "Let's Visualize!"
          )}
        </button>

        {!thinking && !Boolean(prompt) && (
          <h3>What would you like to visualize today?</h3>
        )}

        {Boolean(flagged) && <h3 id="flagged">{flagged}</h3>}

        {!Boolean(flagged) && Boolean(summary) && (
          <div id="response">
            <a href={summary} target="_blank" rel="noreferrer">
              <Image
                src={summary} // the URL of the generated image
                alt="Generated Image"
                width={512} // Set your desired width
                height={512} // Set your desired height
                className="object-contain w-full py-3 cursor-pointer"
              />
            </a>

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
