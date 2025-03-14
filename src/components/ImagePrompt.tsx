"use client";

import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { PulseLoader } from "react-spinners";
import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import { generateImage } from "@/actions/generateImage";
import toast from "react-hot-toast";
import Image from "next/image";
import { copyImageToClipboard, downloadImage } from "@/utils/helpers";
import { checkRestrictedWords, isIOSReactNativeWebView } from "@/utils/platform";

export default function ImagePrompt() {
  const uid = useAuthStore((state) => state.uid);

  const [prompt, setPrompt] = useState("");
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
    console.log("Saving history...");
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
      console.log("History saved with docRef:", docRef.id);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isIOSReactNativeWebView() && checkRestrictedWords(topic)) {
      alert(
        "Your description contains restricted words and cannot be used."
      );
      return;
    }
    setActive(false);
    setSummary("");
    setFlagged("");
    setThinking(true);

    // Show loading toast
    const toastId = toast.loading("Working on the design...");
    console.log("Submitting prompt:", topic);

    const result = await generateImage(topic, uid);

    setPrompt(topic);
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
      {!thinking && !Boolean(prompt) && (
        <h3 className="text-4xl sm:text-4xl md:text-4xl chnage_title font-extrabold my-2 text-center"><span className="bg-linear-to-r from-[#9C26D7] to-[#1EB1DB] bg-clip-text text-transparent">What would you like to visualize today?</span></h3>
      )}
      <form onSubmit={(e) => handleSubmit(e)}>
        <label htmlFor="topic-field" className="text-[#041D34] font-semibold">
          Prompt
          <textarea
            className="bg-[#F5F5F5] text-[#0B3C68] mt-1 border border#ECECEC] font-normal placeholder:text-[#BBBEC9]"
            id="topic-field"
            rows={4}
            placeholder="Enter a freestyle prompt with any information or ideas you want to visualize"
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
        <div className="text-center my-[2rem]!">
          <button className="w-44 text-white px-3 py-2 custom-write bottom bg-[#192449] opacity-100! hover:bg-[#83A873] rounded-3xl! font-bold transition-transform duration-300 ease-in-out" type="submit" disabled={!active}>
            <span className="text-white">{thinking ? (
              <PulseLoader color="#fff" size={8} />
            ) : (
              "Let's Visualize!"
            )}
            </span>
          </button>
        </div>
        {Boolean(flagged) && <h3 id="flagged">{flagged}</h3>}

        {!Boolean(flagged) && Boolean(summary) && (
          <div id="response" className="my-[0rem]!">
            {/* <a href={summary} target="_blank" rel="noreferrer"> */}
            <div className="bg-[#E7EAEF] p-4 rounded-lg">
              <Image
                src={summary} // the URL of the generated image
                alt="Generated Image"
                width={512} // Set your desired width
                height={512} // Set your desired height
                className="object-contain w-full cursor-pointer rounded-lg"
              />
              <div className="download_option flex gap-4 mt-4">
                <div className="copy_icon p-2 w-9 h-9 border border-[#A3AEC0] rounded-[10px] text-center flex justify-center items-center cursor-pointer hover:bg-[#83A873]"
                  onClick={() => copyImageToClipboard(summary)}>
                  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0" y="0" viewBox="0 0 48 48" className=""><g><path d="M33.46 28.672V7.735c0-2.481-2.019-4.5-4.5-4.5H8.023a4.505 4.505 0 0 0-4.5 4.5v20.937c0 2.481 2.019 4.5 4.5 4.5H28.96c2.481 0 4.5-2.019 4.5-4.5zm-26.937 0V7.735c0-.827.673-1.5 1.5-1.5H28.96c.827 0 1.5.673 1.5 1.5v20.937c0 .827-.673 1.5-1.5 1.5H8.023c-.827 0-1.5-.673-1.5-1.5zm33.454-13.844h-3.646a1.5 1.5 0 1 0 0 3h3.646c.827 0 1.5.673 1.5 1.5v20.937c0 .827-.673 1.5-1.5 1.5H19.041c-.827 0-1.5-.673-1.5-1.5v-4.147a1.5 1.5 0 1 0-3 0v4.147c0 2.481 2.019 4.5 4.5 4.5h20.936c2.481 0 4.5-2.019 4.5-4.5V19.328c0-2.481-2.019-4.5-4.5-4.5z" fill="#7F8CA1" opacity="1" data-original="#000000" className="#7F8CA1"></path></g></svg>
                </div>
                <div className="share_icon hidden p-2 w-9 h-9 border border-[#A3AEC0] rounded-[10px] text-center justify-center items-center cursor-pointer hover:bg-[#0A0F20]" >
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_59_140)">
                      <path d="M13.7819 4.68215C13.7819 4.79636 13.7819 4.91057 13.7819 5.02479C13.7819 8.96895 13.7832 12.9131 13.7788 16.8573C13.7788 17.066 13.768 17.2843 13.7058 17.481C13.5224 18.0635 12.9843 18.3953 12.353 18.3471C11.7984 18.304 11.3276 17.882 11.221 17.316C11.1899 17.1517 11.1836 16.9804 11.1829 16.8122C11.181 12.889 11.1817 8.96641 11.1817 5.04319C11.1817 4.92897 11.1817 4.81476 11.1817 4.61362C11.0541 4.73862 10.9767 4.81222 10.9012 4.88773C9.58522 6.20309 8.27114 7.52161 6.95134 8.8338C6.40946 9.3725 5.66137 9.4074 5.12837 8.93341C4.61187 8.47466 4.54081 7.70435 4.96784 7.16121C5.03954 7.07047 5.12393 6.98862 5.20578 6.90677C7.31111 4.79573 9.41708 2.68468 11.523 0.573644C12.0833 0.0120959 12.8777 0.00638521 13.4387 0.567299C15.5687 2.69864 17.6982 4.83126 19.8257 6.96578C20.4158 7.55778 20.4431 8.34395 19.9012 8.88202C19.3606 9.41946 18.5757 9.389 17.985 8.80017C16.6823 7.50067 15.3822 6.19928 14.0833 4.89598C14.0021 4.81476 13.945 4.71007 13.8765 4.61616C13.8454 4.6371 13.8137 4.6593 13.7819 4.68215Z" fill="white" />
                      <path d="M12.5002 24.8674C9.90945 24.8674 7.31808 24.8731 4.72734 24.8655C2.78635 24.8598 1.19815 23.5476 0.86186 21.6403C0.769221 21.1149 0.798408 20.566 0.791429 20.0279C0.783815 19.4258 0.772393 18.8211 0.810464 18.2208C0.84917 17.6117 1.34663 17.1352 1.93546 17.073C2.55856 17.007 3.12455 17.3592 3.31237 17.9537C3.36821 18.1307 3.38153 18.3268 3.38343 18.5146C3.39105 19.2868 3.38343 20.0584 3.38788 20.8306C3.39295 21.738 3.9215 22.2672 4.8295 22.2678C9.93737 22.2697 15.0452 22.2697 20.1531 22.2678C21.0611 22.2678 21.5795 21.7386 21.5808 20.823C21.5827 19.9981 21.5713 19.1732 21.5852 18.3484C21.5966 17.6853 22.0998 17.1403 22.7286 17.073C23.3879 17.0026 23.9672 17.3998 24.141 18.0406C24.1468 18.0609 24.1607 18.0806 24.1601 18.1009C24.1353 19.3452 24.2565 20.6155 24.0484 21.8287C23.7331 23.6688 22.1138 24.8617 20.2413 24.8668C17.6614 24.8725 15.0808 24.8674 12.5002 24.8674Z" fill="white" />
                    </g>
                    <defs>
                      <clipPath id="clip0_59_140">
                        <rect width="25" height="25" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div className="download_icon p-2 w-9 h-9 border border-[#A3AEC0] rounded-[10px] text-center flex justify-center items-center cursor-pointer hover:bg-[#83A873]" onClick={() => downloadImage(summary)}>
                  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0" y="0" viewBox="0 0 515.283 515.283" className=""><g><path d="M400.775 515.283H114.507c-30.584 0-59.339-11.911-80.968-33.54C11.911 460.117 0 431.361 0 400.775v-28.628c0-15.811 12.816-28.628 28.627-28.628s28.627 12.817 28.627 28.628v28.628c0 15.293 5.956 29.67 16.768 40.483 10.815 10.814 25.192 16.771 40.485 16.771h286.268c15.292 0 29.669-5.957 40.483-16.771 10.814-10.815 16.771-25.192 16.771-40.483v-28.628c0-15.811 12.816-28.628 28.626-28.628s28.628 12.817 28.628 28.628v28.628c0 30.584-11.911 59.338-33.54 80.968-21.629 21.629-50.384 33.54-80.968 33.54zM257.641 400.774a28.538 28.538 0 0 1-19.998-8.142l-.002-.002-.057-.056-.016-.016c-.016-.014-.03-.029-.045-.044l-.029-.029a.892.892 0 0 0-.032-.031l-.062-.062-114.508-114.509c-11.179-11.179-11.179-29.305 0-40.485 11.179-11.179 29.306-11.18 40.485 0l65.638 65.638V28.627C229.014 12.816 241.83 0 257.641 0s28.628 12.816 28.628 28.627v274.408l65.637-65.637c11.178-11.179 29.307-11.179 40.485 0 11.179 11.179 11.179 29.306 0 40.485L277.883 392.39l-.062.062-.032.031-.029.029c-.014.016-.03.03-.044.044l-.017.016a1.479 1.479 0 0 1-.056.056l-.002.002c-.315.307-.634.605-.96.895a28.441 28.441 0 0 1-7.89 4.995l-.028.012c-.011.004-.02.01-.031.013a28.5 28.5 0 0 1-11.091 2.229z" fill="#7F8CA1" opacity="1" data-original="#000000" className="# "></path></g></svg>
                </div>
              </div>
            </div>
            {/* </a> */}

            <p className="disclaimer text-[#041D34] mt-2">
              <span>*</span>
              {`I'm a new AI and I'm still learning, so these results might have inaccuracies.`}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
