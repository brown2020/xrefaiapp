import toast from "react-hot-toast";
import { getImagePrompt } from "@/utils/getImagePrompt";
import { generateImage } from "@/actions/generateImage";
import { validateContentWithToast } from "@/utils/contentGuard";
import { PromptDataType } from "@/types/PromptDataType";
import { useHistorySaver } from "@/hooks/useHistorySaver";
import { useGenerationState } from "@/hooks/useGenerationState";
import useProfileStore from "@/zustand/useProfileStore";
import { CREDITS_COSTS } from "@/constants/credits";

const IMAGE_ERROR_MESSAGE =
  "I can't do that. I can't do real people or anything that violates the terms of service. Please try changing the prompt.";

export function useImageGeneration(uid: string | null) {
  const { saveHistory } = useHistorySaver();
  const profile = useProfileStore((s) => s.profile);
  const minusCredits = useProfileStore((s) => s.minusCredits);
  const addCredits = useProfileStore((s) => s.addCredits);
  const {
    summary,
    flagged,
    active,
    thinking,
    startGeneration,
    completeWithSuccess,
    completeWithError,
  } = useGenerationState();

  const handleSubmit = async (promptData: PromptDataType, topic: string) => {
    if (!validateContentWithToast(topic)) {
      return;
    }

    if (!uid) {
      toast.error("Please sign in to generate images.");
      return;
    }

    let charged = false;
    if (profile.useCredits) {
      const cost = CREDITS_COSTS.imageGeneration;
      const ok = await minusCredits(cost);
      if (!ok) {
        toast.error(
          `Not enough credits (${Math.round(
            profile.credits
          )} available, need ${cost}). Please buy more credits in Account.`
        );
        return;
      }
      charged = true;
    }

    startGeneration();
    const toastId = toast.loading("Working on the design...");
    const generatedPrompt = getImagePrompt(promptData, topic);

    const result = await generateImage(generatedPrompt, uid);

    if (result.imageUrl && uid) {
      try {
        completeWithSuccess(result.imageUrl);
        await saveHistory({
          prompt: topic,
          response: result.imageUrl,
          topic,
          words: "image",
          xrefs: [],
        });

        toast.dismiss(toastId);
        toast.success("Image generated!");
      } catch (error) {
        console.error("Error while saving history:", error);
        toast.dismiss(toastId);
        toast.error("Error generating design...");
        completeWithError("Error saving image to history");
        // Refund reserved credits on downstream failure.
        if (charged) {
          await addCredits(CREDITS_COSTS.imageGeneration);
        }
      }
    } else {
      completeWithError(IMAGE_ERROR_MESSAGE);
      toast.dismiss(toastId);
      toast.error("Issue with design...");
      // Refund reserved credits if image generation fails.
      if (charged) {
        await addCredits(CREDITS_COSTS.imageGeneration);
      }
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
