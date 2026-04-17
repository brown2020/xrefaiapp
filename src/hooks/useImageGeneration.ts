import toast from "react-hot-toast";
import { getImagePrompt } from "@/utils/getImagePrompt";
import { generateImage } from "@/actions/generateImage";
import { validateContentWithToast } from "@/utils/contentGuard";
import { PromptDataType } from "@/types/PromptDataType";
import { useHistorySaver } from "@/hooks/useHistorySaver";
import { useGenerationState } from "@/hooks/useGenerationState";
import useProfileStore from "@/zustand/useProfileStore";
import { usePaywallStore } from "@/zustand/usePaywallStore";
import { CREDITS_COSTS } from "@/constants/credits";
import { ROUTES } from "@/constants/routes";
import { useShallow } from "zustand/react/shallow";

const IMAGE_ERROR_MESSAGE =
  "I can't do that. I can't do real people or anything that violates the terms of service. Please try changing the prompt.";

export function useImageGeneration(uid: string | null) {
  const { saveHistory } = useHistorySaver();
  const generationConfig = useProfileStore(
    useShallow((s) => ({
      useCredits: s.profile.useCredits,
      fireworksApiKey: s.profile.fireworks_api_key,
    }))
  );
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const openPaywall = usePaywallStore((s) => s.openPaywall);
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
    if (!validateContentWithToast(topic)) return;

    if (!uid) {
      toast.error("Please sign in to generate images.");
      return;
    }

    startGeneration();
    const toastId = toast.loading("Working on the design...");
    const generatedPrompt = getImagePrompt(promptData, topic);

    let result: { imageUrl?: string; error?: string };
    try {
      result = await generateImage(generatedPrompt, {
        useCredits: generationConfig.useCredits,
        fireworksApiKey: generationConfig.fireworksApiKey,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      toast.dismiss(toastId);
      toast.error("Issue with design...");
      completeWithError("Error generating image");
      return;
    }

    if (result.imageUrl) {
      try {
        completeWithSuccess(result.imageUrl);
        if (generationConfig.useCredits) await fetchProfile();
        try {
          await saveHistory({
            prompt: topic,
            response: result.imageUrl,
            topic,
            words: "image",
            xrefs: [],
          });
        } catch (historyError) {
          console.error("Error saving image history:", historyError);
          toast.error("Image generated but couldn't be saved to history.");
        }

        toast.dismiss(toastId);
        toast.success("Image generated!");
      } catch (error) {
        console.error("Error while finalizing image generation:", error);
        toast.dismiss(toastId);
        toast.error("Error generating design...");
        completeWithError("Error saving image to history");
      }
      return;
    }

    toast.dismiss(toastId);
    if (result.error === "INSUFFICIENT_CREDITS") {
      toast.error("Not enough credits. Please buy more credits in Account.");
      openPaywall({
        actionLabel: "Image generation",
        requiredCredits: CREDITS_COSTS.imageGeneration,
        redirectPath: ROUTES.tools,
      });
      completeWithError("Not enough credits");
      return;
    }
    if (
      result.error === "DUPLICATE_REQUEST" ||
      result.error === "REQUEST_IN_PROGRESS"
    ) {
      toast.error("That request is already being handled. Please wait a moment.");
      completeWithError("Duplicate request");
      return;
    }
    completeWithError(IMAGE_ERROR_MESSAGE);
    toast.error("Issue with design...");
  };

  return {
    summary,
    flagged,
    active,
    thinking,
    handleSubmit,
  };
}
