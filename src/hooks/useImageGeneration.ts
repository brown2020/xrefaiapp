import { useState } from 'react';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '@/firebase/firebaseClient';
import { getImagePrompt } from '@/utils/getImagePrompt';
import { generateImage } from '@/actions/generateImage';
import { checkRestrictedWords, isIOSReactNativeWebView } from '@/utils/platform';
import { PromptDataType } from '@/types/PromptDataType';

export function useImageGeneration(uid: string | null) {
  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [flagged, setFlagged] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [thinking, setThinking] = useState<boolean>(false);

  const saveHistory = async (
    prompt: string,
    response: string,
    topic: string,
    words: string,
    xrefs: string[]
  ) => {
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
  };

  const handleSubmit = async (promptData: PromptDataType, topic: string) => {
    if (isIOSReactNativeWebView() && checkRestrictedWords(topic)) {
      alert("Your description contains restricted words and cannot be used.");
      return;
    }

    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);

    const toastId = toast.loading("Working on the design...");
    const generatedPrompt = getImagePrompt(promptData, topic);

    const result = await generateImage(generatedPrompt, uid || '');

    setPrompt(generatedPrompt);
    setThinking(false);
    console.log("Result from generateImage:", result);

    if (result.imageUrl && uid) {
      try {
        setSummary(result.imageUrl);
        await saveHistory(topic, result.imageUrl, topic, "image", []);

        toast.dismiss(toastId);
        toast.success("History saved!");
        setActive(true);
      } catch (error) {
        console.log("Error while saving history:", error);
        toast.dismiss(toastId);
        toast.error("Error generating design...");
        setActive(true);
      }
    } else {
      setFlagged(
        "I can't do that. I can't do real people or anything that violates the terms of service. Please try changing the prompt."
      );
      console.log("Flagged response:", flagged);

      toast.dismiss(toastId);
      toast.error("Issue with design...");
      setActive(true);
    }
  };

  return {
    prompt,
    summary,
    flagged,
    active,
    thinking,
    handleSubmit,
    setPrompt,
    setSummary,
    setFlagged,
    setActive,
    setThinking
  };
}
