"use client";

import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { PulseLoader } from "react-spinners";
import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import { generateImage } from "@/actions/generateImage";
import toast from "react-hot-toast";
import Image from "next/image";

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

  // const copyImageToClipboard = async (imageUrlData: string | URL | Request) => {
  //   try {
  //     // Create a temporary input element
  //     const input = document.createElement('input');
  //     console.log(input,"input");
      
  //     input.value = imageUrlData;
  //     document.body.appendChild(input);
  //     input.select();
  //     document.execCommand('copy'); // Use execCommand to copy the selected text
  //     document.body.removeChild(input); // Remove the temporary input

  //     toast.success('Image URL copied to clipboard!');
  //   } catch (err) {
  //     console.log(err,"err");
  //     toast.error('Failed to copy image URL: ');
  //     alert('Failed to copy image URL.');
  //   }
  // };

  const copyImageToClipboard = async (imageUrlData: string | URL) => {
    try {
      // Use the Clipboard API to write the image URL to the clipboard
      if (navigator.clipboard && window.isSecureContext) {
        // If the environment supports the Clipboard API
        await navigator.clipboard.writeText(imageUrlData.toString());
        toast.success('Image URL copied to clipboard!');
      } else {
        // Fallback if the Clipboard API is not available
        const input = document.createElement('input');
        input.value = imageUrlData.toString();
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        toast.success('Image URL copied to clipboard!');
      }
    } catch (err) {
      console.log(err, "err");
      toast.error('Failed to copy image URL');
      alert('Failed to copy image URL.');
    }
  };
  const shareImage = async () => {
    try {
      toast.success('Comming Soon');
    } catch (err) {
      console.log(err,"err");
      toast.error('Failed to copy image URL: ');
      alert('Failed to copy images URL.');
    }
  };
  const downloadImage = async () => {
    try {
      toast.success('Comming Soon');
    } catch (err) {
      console.log(err,"err");
      toast.error('Failed to copy image URL: ');
      alert('Failed to copy image URL.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        <h3 className="text-4xl sm:text-4xl md:text-4xl chnage_title font-extrabold my-2 text-center"><span className="bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] bg-clip-text text-transparent">What would you like to visualize today?</span></h3>
      )}
      <form onSubmit={(e) => handleSubmit(e)}>
        <label htmlFor="topic-field" className="text-[#585E70] font-bold">
          Prompt
          <textarea
            className="bg-[#131C3C] text-white mt-1 border border-[#263566] font-normal placeholder:text-[#585E70]"
            id="topic-field"
            rows={4}
            placeholder="Enter a freestyle prompt with any information or ideas you want to visualize"
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
        <div className="text-center !my-[2rem]">
          <button className="w-44 custom-write bottom bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] !rounded-3xl font-bold" type="submit" disabled={!active}>
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
          <div id="response" className="!my-[0rem]">
            {/* <a href={summary} target="_blank" rel="noreferrer"> */}
              <div className="bg-[#293A74] p-4 rounded-lg">
                <Image
                  src={summary} // the URL of the generated image
                  alt="Generated Image"
                  width={512} // Set your desired width
                  height={512} // Set your desired height
                  className="object-contain w-full cursor-pointer rounded-lg"
                />
                <div className="download_option flex gap-4 mt-4">
                  <div className="copy_icon p-2 w-9 h-9 border border-[#4863BE] rounded-[10px] text-center flex justify-center items-center cursor-pointer" onClick={()=> copyImageToClipboard(summary)}>
                    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.0938 8.8125H22.875C24.6009 8.8125 26 10.2116 26 11.9375V22.875C26 24.6009 24.6009 26 22.875 26H11.9375C10.2116 26 8.8125 24.6009 8.8125 22.875V22.0938M4.125 18.1875H15.0625C16.7884 18.1875 18.1875 16.7884 18.1875 15.0625V4.125C18.1875 2.39911 16.7884 1 15.0625 1H4.125C2.39911 1 1 2.39911 1 4.125V15.0625C1 16.7884 2.39911 18.1875 4.125 18.1875Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </div>
                  <div className="share_icon p-2 w-9 h-9 border border-[#4863BE] rounded-[10px] text-center flex justify-center items-center cursor-pointer" onClick={()=> shareImage()}>
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
                  <div className="download_icon p-2 w-9 h-9 border border-[#4863BE] rounded-[10px] text-center flex justify-center items-center cursor-pointer" onClick={()=> downloadImage()}>
                    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_59_145)">
                        <path d="M11.1859 13.835C11.1859 13.7239 11.1859 13.6129 11.1859 13.5012C11.1859 9.53611 11.1846 5.57101 11.1865 1.60527C11.1872 0.69791 11.7804 0.112885 12.6237 0.177606C13.2252 0.223926 13.7316 0.727098 13.7779 1.33052C13.7887 1.46758 13.7861 1.60527 13.7861 1.74233C13.7868 5.6757 13.7861 9.60908 13.7861 13.5431C13.7861 13.6446 13.7861 13.7461 13.7861 13.9092C13.9105 13.7925 13.9936 13.7195 14.0717 13.6408C15.3807 12.3324 16.6897 11.0247 17.9968 9.71504C18.3769 9.33433 18.816 9.16492 19.349 9.31783C20.2347 9.57164 20.5812 10.6319 20.0146 11.3578C19.9302 11.4657 19.8293 11.5609 19.7322 11.6579C17.6408 13.7537 15.5488 15.8489 13.4568 17.9441C12.8921 18.5101 12.099 18.5228 11.5412 17.9644C9.40353 15.8254 7.26901 13.6827 5.13132 11.5431C4.77662 11.1878 4.61102 10.7709 4.72523 10.2772C4.95492 9.2804 6.14528 8.9257 6.89401 9.63446C7.41622 10.1287 7.91431 10.6478 8.4232 11.156C9.25315 11.986 10.0844 12.8147 10.9118 13.6478C10.9822 13.7188 11.0241 13.8172 11.0799 13.9029C11.1148 13.8813 11.1504 13.8578 11.1859 13.835Z" fill="white" />
                        <path d="M12.5045 24.8655C9.91316 24.8655 7.32179 24.8712 4.73042 24.8636C2.78879 24.8578 1.2006 23.5457 0.864302 21.6383C0.771662 21.1129 0.80085 20.5641 0.79387 20.026C0.786256 19.4238 0.774835 18.8191 0.812906 18.2189C0.851611 17.6097 1.34907 17.1332 1.93791 17.071C2.561 17.0051 3.12699 17.3572 3.31544 17.9518C3.37128 18.1288 3.38461 18.3248 3.38651 18.5127C3.39412 19.2849 3.38651 20.0564 3.39095 20.8287C3.39603 21.736 3.92458 22.2652 4.83258 22.2658C9.94108 22.2677 15.0502 22.2677 20.1587 22.2658C21.0667 22.2658 21.5851 21.7367 21.587 20.821C21.5889 19.9962 21.5775 19.1713 21.5915 18.3464C21.6029 17.6834 22.1061 17.1383 22.7349 17.071C23.3941 17.0006 23.9734 17.3978 24.1473 18.0387C24.153 18.059 24.167 18.0787 24.1663 18.099C24.1416 19.3432 24.2628 20.6129 24.0547 21.8268C23.7393 23.6669 22.12 24.8597 20.2469 24.8648C17.6657 24.8705 15.0851 24.8655 12.5045 24.8655Z" fill="white" />
                      </g>
                      <defs>
                        <clipPath id="clip0_59_145">
                          <rect width="25" height="25" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            {/* </a> */}

            <p className="disclaimer text-white mt-2">
              <span>*</span>
              {`I'm a new AI and I'm still learning, so these results might have inaccuracies.`}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
