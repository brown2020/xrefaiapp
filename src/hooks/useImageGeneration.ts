import { useState } from "react";
import toast from "react-hot-toast";
import { getImagePrompt } from "@/utils/getImagePrompt";
import { generateImage } from "@/actions/generateImage";
import { validateContentWithAlert } from "@/utils/contentGuard";
import { PromptDataType } from "@/types/PromptDataType";
import { useHistorySaver } from "@/hooks/useHistorySaver";

export function useImageGeneration(uid: string | null) {
  const { saveHistory } = useHistorySaver();
  const [summary, setSummary] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [thinking, setThinking] = useState<boolean>(false);

  const handleSubmit = async (promptData: PromptDataType, topic: string) => {
    if (!validateContentWithAlert(topic)) {
      return;
    }

    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);

    const toastId = toast.loading("Working on the design...");
    const generatedPrompt = getImagePrompt(promptData, topic);

    const result = await generateImage(generatedPrompt, uid || "");

    setThinking(false);

    if (result.imageUrl && uid) {
      try {
        setSummary(result.imageUrl);
        await saveHistory({
          prompt: topic,
          response: result.imageUrl,
          topic,
          words: "image",
          xrefs: [],
        });

        toast.dismiss(toastId);
        toast.success("Image generated!");
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

  return {
    summary,
    flagged,
    active,
    thinking,
    handleSubmit,
  };
}
