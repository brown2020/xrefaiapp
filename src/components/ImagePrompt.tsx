"use client";

import { useState } from "react";
import { generateImage } from "@/actions/generateImage";
import toast from "react-hot-toast";
import Image from "next/image";
import { copyImageToClipboard, downloadImage } from "@/utils/clipboard";
import { validateContentWithToast } from "@/utils/contentGuard";
import { StyledSelect } from "@/components/DesignerPrompt/StyledSelect";
import { painters } from "@/data/painters";
import { useHistorySaver } from "@/hooks/useHistorySaver";
import { useScrollToResult } from "@/hooks/useScrollToResult";
import { useGenerationState } from "@/hooks/useGenerationState";
import { Copy, Download } from "lucide-react";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ResponseDisplay } from "@/components/ui/ResponseDisplay";

const IMAGE_ERROR_MESSAGE =
  "I can't do that. I can't do real people or anything that violates the terms of service. Please try changing the prompt.";

export default function ImagePrompt() {
  const { saveHistory, uid } = useHistorySaver();
  const {
    summary,
    flagged,
    active,
    thinking,
    startGeneration,
    completeWithSuccess,
    completeWithError,
  } = useGenerationState();

  const [topic, setTopic] = useState("");
  const [selectedPainter, setSelectedPainter] = useState("");

  useScrollToResult(summary, flagged);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const finalTopic = selectedPainter
      ? `${topic}. In the style of ${selectedPainter}`
      : topic;

    if (!validateContentWithToast(finalTopic)) {
      return;
    }

    startGeneration();
    const toastId = toast.loading("Working on the design...");

    const result = await generateImage(finalTopic, uid || "");

    if (result.imageUrl && uid) {
      try {
        completeWithSuccess(result.imageUrl);
        await saveHistory({
          prompt: finalTopic,
          response: result.imageUrl,
          topic: finalTopic,
          words: "image",
          xrefs: [],
        });

        toast.dismiss(toastId);
        toast.success("Image generated successfully!");
      } catch (error) {
        console.error("Error while saving history:", error);
        toast.dismiss(toastId);
        toast.error("Error generating design...");
        completeWithError("Error saving to history");
      }
    } else {
      completeWithError(IMAGE_ERROR_MESSAGE);
      toast.dismiss(toastId);
      toast.error("Issue with design...");
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

        <label htmlFor="topic-field" className={labelClassName}>
          Prompt
          <textarea
            className={inputClassName}
            id="topic-field"
            rows={4}
            placeholder="Enter a freestyle prompt with any information or ideas you want to visualize"
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>

        <SubmitButton
          isLoading={thinking}
          disabled={!active || !topic.trim()}
          loadingText="Visualizing"
          className="mt-6"
        >
          Let&apos;s Visualize!
        </SubmitButton>

        <ResponseDisplay flagged={flagged} summary={summary}>
          <div className="mt-6 bg-[#E7EAEF] p-4 rounded-lg">
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
        </ResponseDisplay>
      </form>
    </div>
  );
}
