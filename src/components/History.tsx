"use client";

import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/zustand/useAuthStore";
import { db } from "@/firebase/firebaseClient";
import toast from "react-hot-toast";
import { UserHistoryType } from "@/types/UserHistoryType";
import { copyToClipboard } from "@/utils/copyToClipboard"; // Assuming you have this utility
import Image from "next/image";
import RootLayout from "@/app/layout"; // Import the Image component from Next.js
import { copyImageToClipboard, downloadImage } from "@/utils/helpers";

export default function History() {
  const uid = useAuthStore((state) => state.uid);
  const [summaries, setSummaries] = useState<UserHistoryType[]>([]);
  const [search, setSearch] = useState<string>("");
  const [lastKey, setLastKey] = useState<Timestamp | undefined>(undefined);

  // Track collapsed/expanded state for each prompt and response
  const [expandedPrompts, setExpandedPrompts] = useState<{
    [key: number]: boolean;
  }>({});
  const [expandedResponses, setExpandedResponses] = useState<{
    [key: number]: boolean;
  }>({});

  // Toggle expansion for prompts
  const togglePromptExpand = (index: number) => {
    setExpandedPrompts((prev) => ({
      ...prev,
      [index]: !prev[index], // Toggle the specific index
    }));
  };

  // Toggle expansion for responses
  const toggleResponseExpand = (index: number) => {
    setExpandedResponses((prev) => ({
      ...prev,
      [index]: !prev[index], // Toggle the specific index
    }));
  };

  const orderedSummaries = summaries
    .slice()
    .sort((a, b) =>
      b.timestamp.seconds > a.timestamp.seconds
        ? 1
        : b.timestamp.seconds < a.timestamp.seconds
          ? -1
          : 0
    );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const getData = async () => {
      if (uid) {
        const c = collection(db, "users", uid, "summaries");
        const q = query(c, orderBy("timestamp", "desc"), limit(100));
        const querySnapshot = await getDocs(q);

        const s: UserHistoryType[] = [];
        let lastKey: Timestamp | undefined = undefined;
        querySnapshot.forEach((doc) => {
          const d = doc.data();

          s.push({
            id: d.id,
            prompt: d.prompt,
            response: d.response,
            timestamp: d.timestamp,
            topic: d.topic,
            words: d.words,
            xrefs: d.xrefs,
          });
          lastKey = doc.data().timestamp;
        });

        setSummaries(s);
        setLastKey(lastKey);
      }
    };
    getData();
  }, [uid]);

  const postsNextBatch = async (key: Timestamp) => {
    if (uid) {
      const toastId = toast.loading("Loading history...");
      const c = collection(db, "users", uid, "summaries");
      const q = query(
        c,
        orderBy("timestamp", "desc"),
        startAfter(key),
        limit(100)
      );
      const querySnapshot = await getDocs(q);
      const s: UserHistoryType[] = summaries;
      let lastKey: Timestamp | undefined;
      querySnapshot.forEach((doc) => {
        const d = doc.data();

        s.push({
          id: d.id,
          prompt: d.prompt,
          response: d.response,
          timestamp: d.timestamp,
          topic: d.topic,
          words: d.words,
          xrefs: d.xrefs,
        });
        lastKey = doc.data().timestamp;
      });

      toast.dismiss(toastId);
      toast.success("History loaded successfully");

      setSummaries(s);
      setLastKey(lastKey);
    }
  };

  if (!uid) return <div>Not signed in</div>;

  return (
    <RootLayout showFooter={false}>
      <div className="flex flex-col space-y-5">
        <div className="container mx-auto px-4 py-4">
          <div className="w-full mb-5 border-[#263566] border-2 py-2 rounded-md  bg-[#131C3C] flex">
            <input
              className="px-3 py-1 border-0 outline-none w-full text-white bg-[#131C3C] border-[#263566] placeholder:text-[#585E70]"
              type="text"
              placeholder="Filter results..."
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="px-4 line-box relative before:absolute before:content-[''] before:w-[2px] before:bg-[#A1ADF4] before:h-[20px] before:top-1/2 before:left-0 before:transform before:-translate-x-1/2 before:-translate-y-1/2"><i className="fa-solid fa-magnifying-glass text-[#A1ADF4]"></i></button>
          </div>
          <div className="flex flex-col space-y-5">
            {orderedSummaries &&
              orderedSummaries
                .filter((summary) =>
                  (summary.response + " " + summary.prompt)
                    .toUpperCase()
                    .includes(search ? search.toUpperCase() : "")
                )
                .map((summary, index) => (
                  <div key={index} className="p-5 rounded-3xl shadow-md bg-[#192449]">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex items-center justify-center flex-shrink-0 w-11 h-11 text-xs font-bold text-white rounded-full bg-blue-500">
                        {/* You */}
                        <Image
                          width={100}
                          height={100}
                          src="/Ellipse 4.png"
                          alt="" />
                      </div>
                      <div className="flex flex-col w-[95%] ">
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-white font-bold mb-[0.2rem]">You</h3>
                            <p className="text-white text-xs">{new Date(summary.timestamp.seconds * 1000).toLocaleString()}</p>
                          </div>
                          <div className="">
                            {expandedPrompts[index] ? (
                              <div className="text-[#A1ADF4] cursor-pointer"><ChevronUp className="inline-block ml-2 " /></div>
                            ) : (
                              <div className="text-[#A1ADF4] cursor-pointer"><ChevronDown className="inline-block ml-2 " /></div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`flex items-center break-word whitespace-pre-wrap cursor-pointer transition-all duration-300 ease-in-out text-[#A1ADF4] ${expandedPrompts[index]
                            ? "max-h-full"
                            : "max-h-20 overflow-hidden"
                            }`}
                          onClick={() => togglePromptExpand(index)}
                        >
                          {summary.prompt}
                        </div>
                      </div>
                    </div>
                    {/* Collapsible prompt */}
                    {/* <div
                      className={`whitespace-pre-wrap cursor-pointer mt-2 transition-all duration-300 ease-in-out text-[#A1ADF4] ${expandedPrompts[index]
                        ? "max-h-full"
                        : "max-h-20 overflow-hidden"
                        }`}
                      onClick={() => togglePromptExpand(index)}
                    >
                      {summary.prompt}
                      {expandedPrompts[index] ? (
                        <ChevronUp className="inline-block ml-2" />
                      ) : (
                        <ChevronDown className="inline-block ml-2" />
                      )}
                    </div> */}

                    {/* Collapsible response with bg-orange-200 */}
                    {summary.words === "image" ? (
                      <div className="mt-2 p-4 rounded-3xl bg-[#293A74] sm:w-[50%] w-full">
                        <a href={summary.response} target="_blank" rel="noreferrer">
                          <Image
                            src={summary.response}
                            alt="Generated Image"
                            width={512}
                            height={512}
                            className="displayImage rounded-2xl w-[100%] "
                          />
                        </a>
                        <div className="flex gap-4 mt-4">
                          <div className="copy_icon p-2 w-9 h-9 border border-[#4863BE] rounded-[10px] text-center flex justify-center items-center cursor-pointer hover:bg-[#B6F09C] "
                            onClick={() => copyImageToClipboard(summary.response)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0" y="0" viewBox="0 0 48 48"  className=""><g><path d="M33.46 28.672V7.735c0-2.481-2.019-4.5-4.5-4.5H8.023a4.505 4.505 0 0 0-4.5 4.5v20.937c0 2.481 2.019 4.5 4.5 4.5H28.96c2.481 0 4.5-2.019 4.5-4.5zm-26.937 0V7.735c0-.827.673-1.5 1.5-1.5H28.96c.827 0 1.5.673 1.5 1.5v20.937c0 .827-.673 1.5-1.5 1.5H8.023c-.827 0-1.5-.673-1.5-1.5zm33.454-13.844h-3.646a1.5 1.5 0 1 0 0 3h3.646c.827 0 1.5.673 1.5 1.5v20.937c0 .827-.673 1.5-1.5 1.5H19.041c-.827 0-1.5-.673-1.5-1.5v-4.147a1.5 1.5 0 1 0-3 0v4.147c0 2.481 2.019 4.5 4.5 4.5h20.936c2.481 0 4.5-2.019 4.5-4.5V19.328c0-2.481-2.019-4.5-4.5-4.5z" fill="#000000" opacity="1" data-original="#000000" className="fill-white"></path></g></svg>
                          </div>
                          <div className="share_icon hidden p-2 w-9 h-9 border border-[#4863BE] rounded-[10px] text-center justify-center items-center cursor-pointer">
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
                          <div className="download_icon p-2 w-9 h-9 border border-[#4863BE] rounded-[10px] text-center flex justify-center items-center cursor-pointer hover:bg-[#B6F09C]" onClick={() => downloadImage(summary.response)}>
                            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0" y="0" viewBox="0 0 515.283 515.283" className=""><g><path d="M400.775 515.283H114.507c-30.584 0-59.339-11.911-80.968-33.54C11.911 460.117 0 431.361 0 400.775v-28.628c0-15.811 12.816-28.628 28.627-28.628s28.627 12.817 28.627 28.628v28.628c0 15.293 5.956 29.67 16.768 40.483 10.815 10.814 25.192 16.771 40.485 16.771h286.268c15.292 0 29.669-5.957 40.483-16.771 10.814-10.815 16.771-25.192 16.771-40.483v-28.628c0-15.811 12.816-28.628 28.626-28.628s28.628 12.817 28.628 28.628v28.628c0 30.584-11.911 59.338-33.54 80.968-21.629 21.629-50.384 33.54-80.968 33.54zM257.641 400.774a28.538 28.538 0 0 1-19.998-8.142l-.002-.002-.057-.056-.016-.016c-.016-.014-.03-.029-.045-.044l-.029-.029a.892.892 0 0 0-.032-.031l-.062-.062-114.508-114.509c-11.179-11.179-11.179-29.305 0-40.485 11.179-11.179 29.306-11.18 40.485 0l65.638 65.638V28.627C229.014 12.816 241.83 0 257.641 0s28.628 12.816 28.628 28.627v274.408l65.637-65.637c11.178-11.179 29.307-11.179 40.485 0 11.179 11.179 11.179 29.306 0 40.485L277.883 392.39l-.062.062-.032.031-.029.029c-.014.016-.03.03-.044.044l-.017.016a1.479 1.479 0 0 1-.056.056l-.002.002c-.315.307-.634.605-.96.895a28.441 28.441 0 0 1-7.89 4.995l-.028.012c-.011.004-.02.01-.031.013a28.5 28.5 0 0 1-11.091 2.229z" fill="#fff" opacity="1" data-original="#000000" className="fill-[#fff] "></path></g></svg>

                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start items-start w-full p-4 ml-auto gap-2 rounded-3xl text-left bg-[#293A74]">
                        <div className="p-2">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0A0F20]">
                            <Image
                              src="/logo(X).png"
                              alt="bot"
                              className="flex-shrink-0 object-contain w-10 h-10 rounded-full px-[5px]"
                              width={40}
                              height={40}
                            />
                          </div>
                        </div>
                        <div className="relative w-full">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex justify-between items-center w-full">
                              <div className="flex gap-3 items-center">
                                <h3 className="m-0 text-white font-semibold">XEEF.AI</h3>
                                <p className="px-[10px] py-0 text-[12px] rounded-[10px] bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] text-white">Bot</p>
                              </div>
                              <div>
                                {expandedResponses[index] ? (
                                  <div className="text-[#A1ADF4] relative before:absolute before:content-[''] before:w-[2px] before:bg-[#A1ADF4] before:h-[16px] before:top-1/2 before:left-0 before:transform before:-translate-x-1/2 before:-translate-y-1/2"><ChevronUp className="inline-block ml-2 cursor-pointer" /></div>
                                ) : (
                                  <div className="text-[#A1ADF4] relative before:absolute before:content-[''] before:w-[2px] before:bg-[#A1ADF4] before:h-[16px] before:top-1/2 before:left-0 before:transform before:-translate-x-1/2 before:-translate-y-1/2"><ChevronDown className="inline-block ml-2 cursor-pointer" /></div>
                                )}
                              </div>
                            </div>
                            {/* Copy to clipboard button */}
                            <button
                              onClick={() => copyToClipboard(summary.response)}
                              className="p-[6px] ml-3 w-8 h-8 border border-[#4863BE] rounded-[10px] text-center flex justify-center items-center cursor-pointer"
                              title="Copy to Clipboard"
                            >
                              <Copy className="text-white" />
                            </button>
                          </div>
                          <div
                            className={`whitespace-pre-wrap break-word cursor-pointer text-[#A1ADF4] p-0 rounded-md transition-all duration-300 ease-in-out ${expandedResponses[index]
                              ? "max-h-full"
                              : "max-h-20 overflow-hidden"
                              }`}
                            onClick={() => toggleResponseExpand(index)}
                          >
                            <div>{summary.response}</div>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                ))}
          </div>
          {lastKey && (
            <div className="text-center"><button onClick={() => postsNextBatch(lastKey)} className="mt-4 w-44 text-white px-3 py-2 custom-write bottom bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] hover:opacity-50 !rounded-3xl font-bold">Load More</button></div>
          )}
        </div>
      </div>
    </RootLayout>
  );
}
