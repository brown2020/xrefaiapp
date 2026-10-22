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
import { createClientIdempotencyKey } from "@/utils/clientIdempotencyKey";
import { notEnoughCreditsMessage } from "@/utils/platform";
import { imageFailureMessage } from "@/utils/imageErrors";

export function useImageGeneration(uid: string | null) {
  const { saveHistory } = useHistorySaver();
  const generationConfig = useProfileStore(
    useShallow((s) => ({
      useCredits: s.profile.useCredits,
      openaiApiKey: s.profile.openai_api_key,
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
    const toastId = toast.loading("Generating your image…");
    const generatedPrompt = getImagePrompt(promptData, topic);

    let result: { imageUrl?: string; error?: string };
    try {
      result = await generateImage(generatedPrompt, {
        useCredits: generationConfig.useCredits,
        openaiApiKey: generationConfig.openaiApiKey,
        idempotencyKey: createClientIdempotencyKey(),
      });
    } catch (error) {
      console.error("Error generating image:", error);
      toast.dismiss(toastId);
      toast.error("Could not generate the image. Try again in a moment.");
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
        toast.error("The image was generated but could not be finalized. Check History, then try again.");
        completeWithError("Error saving image to history");
      }
      return;
    }

    toast.dismiss(toastId);
    if (result.error === "INSUFFICIENT_CREDITS") {
      toast.error(notEnoughCreditsMessage());
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
    if (result.error === "RATE_LIMITED") {
      toast.error("Too many image requests. Please wait a moment.");
      completeWithError("Rate limited");
      return;
    }
    const failureMessage = imageFailureMessage(result.error);
    completeWithError(failureMessage);
    toast.error(failureMessage);
  };

  return {
    summary,
    flagged,
    active,
    thinking,
    handleSubmit,
  };
}
