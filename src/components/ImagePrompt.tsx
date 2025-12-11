"use client";

import { useState } from "react";
import { generateImage } from "@/actions/generateImage";
import toast from "react-hot-toast";
import Image from "next/image";
import { copyImageToClipboard, downloadImage } from "@/utils/clipboard";
import {
  checkRestrictedWords,
  isIOSReactNativeWebView,
} from "@/utils/platform";
import { StyledSelect } from "@/components/DesignerPrompt/StyledSelect";
import { painters } from "@/data/painters";
import { useHistorySaver } from "@/hooks/useHistorySaver";
import { useScrollToResult } from "@/hooks/useScrollToResult";
import { Copy, Download } from "lucide-react";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";

export default function ImagePrompt() {
  const { saveHistory, uid } = useHistorySaver();

  const [summary, setSummary] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [thinking, setThinking] = useState<boolean>(false);

  const [topic, setTopic] = useState<string>("");
  const [selectedPainter, setSelectedPainter] = useState<string>("");

  useScrollToResult(summary, flagged);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let finalTopic = topic;
    if (selectedPainter) {
      finalTopic = `${topic}. In the style of ${selectedPainter}`;
    }

    if (isIOSReactNativeWebView() && checkRestrictedWords(finalTopic)) {
      alert("Your description contains restricted words and cannot be used.");
      return;
    }

    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);

    const toastId = toast.loading("Working on the design...");

    const result = await generateImage(finalTopic, uid || "");

    setThinking(false);

    if (result.imageUrl && uid) {
      try {
        setSummary(result.imageUrl);
        await saveHistory({
          prompt: finalTopic,
          response: result.imageUrl,
          topic: finalTopic,
          words: "image",
          xrefs: [],
        });

        toast.dismiss(toastId);
        toast.success("Image generated successfully!");
        setActive(true);
      } catch (error) {
        console.error("Error while saving history:", error);
        toast.dismiss(toastId);
        toast.error("Error generating design...");
        setActive(true);
      }
    } else {
      setFlagged(
        "I can't do that. I can't do real people or anything that violates the terms of service. Please try changing the prompt."
      );

      toast.dismiss(toastId);
      toast.error("Issue with design...");
      setActive(true);
    }
  };

  return (
    <div className="form-wrapper">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <StyledSelect
            label="Artist Inspiration (Optional)"
            name="painters"
            options={painters}
            onChange={(v) => setSelectedPainter(v ? v.value : "")}
            placeholder="Select an artist style..."
          />
        </div>

        <label htmlFor="topic-field" className="text-[#041D34] font-semibold">
          Prompt
          <textarea
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] w-full p-3 rounded-md outline-none"
            id="topic-field"
            rows={4}
            placeholder="Enter a freestyle prompt with any information or ideas you want to visualize"
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>

        <button
          className={`w-full mt-6 py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center ${
            active
              ? "bg-[#192449] text-white hover:bg-[#263566]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          type="submit"
          disabled={!active || !topic.trim()}
        >
          {thinking ? (
            <div className="flex items-center gap-2">
              <span>Visualizing</span>
              <InlineSpinner size="sm" />
            </div>
          ) : (
            "Let's Visualize!"
          )}
        </button>

        {Boolean(flagged) && (
          <h3
            id="flagged"
            className="p-3 bg-red-100 text-red-800 my-3 rounded-md"
          >
            {flagged}
          </h3>
        )}

        {!Boolean(flagged) && Boolean(summary) && (
          <div id="response" className="mt-6">
            <div className="bg-[#E7EAEF] p-4 rounded-lg">
              <Image
                src={summary}
                alt="Generated Image"
                width={512}
                height={512}
                className="object-contain w-full cursor-pointer rounded-lg"
                unoptimized
              />
              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => copyImageToClipboard(summary)}
                  className="flex items-center gap-2 p-2 border border-[#A3AEC0] rounded-lg text-gray-600 hover:bg-[#83A873] hover:text-white transition-colors"
                >
                  <Copy size={16} />
                  <span className="text-sm">Copy URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadImage(summary)}
                  className="flex items-center gap-2 p-2 border border-[#A3AEC0] rounded-lg text-gray-600 hover:bg-[#83A873] hover:text-white transition-colors"
                >
                  <Download size={16} />
                  <span className="text-sm">Download</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
