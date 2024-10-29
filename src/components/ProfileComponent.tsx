"use client";

import Link from "next/link";
import useProfileStore from "@/zustand/useProfileStore";
import { useEffect, useState } from "react";
import { isIOSReactNativeWebView } from "@/utils/platform"; // Import the platform check function

export default function ProfileComponent() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const [fireworksApiKey, setFireworksApiKey] = useState(
    profile.fireworks_api_key
  );
  const [openaiApiKey, setOpenaiApiKey] = useState(profile.openai_api_key);
  const [stabilityAPIKey, setStabilityAPIKey] = useState(
    profile.stability_api_key
  );
  const [useCredits, setUseCredits] = useState(profile.useCredits);
  const [showCreditsSection, setShowCreditsSection] = useState(true); // State to control visibility of credits section

  useEffect(() => {
    setFireworksApiKey(profile.fireworks_api_key);
    setOpenaiApiKey(profile.openai_api_key);
    setStabilityAPIKey(profile.stability_api_key);

    // Hide credits section if in iOS WebView
    setShowCreditsSection(!isIOSReactNativeWebView());
  }, [
    profile.fireworks_api_key,
    profile.openai_api_key,
    profile.stability_api_key,
  ]);

  const handleApiKeyChange = async () => {
    if (
      fireworksApiKey !== profile.fireworks_api_key ||
      openaiApiKey !== profile.openai_api_key ||
      stabilityAPIKey !== profile.stability_api_key
    ) {
      try {
        await updateProfile({
          fireworks_api_key: fireworksApiKey,
          openai_api_key: openaiApiKey,
          stability_api_key: stabilityAPIKey,
        });
        console.log("API keys updated successfully!");
      } catch (error) {
        console.error("Error updating API keys:", error);
      }
    }
  };

  const handleCreditsChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setUseCredits(e.target.value === "credits");
    await updateProfile({ useCredits: e.target.value === "credits" });
  };

  const areApiKeysAvailable = fireworksApiKey && openaiApiKey;

  return (
    <div className="flex flex-col gap-4 ">
      {showCreditsSection && ( // Conditionally render the credits section
        <div className="bg-[#ffffff] border border-[#81878D] rounded-2xl">
          <div className="flex flex-col sm:flex-row px-5 py-3 gap-3">
            <div className="flex items-center by-credits gap-2 pt-2 pb-2 w-full">
              <div className="w-[25%] usage-credits-block">
                <span className="text-[#041D34] font-normal">Usage Credits:</span>
                <span className="text-[#83A873] font-semibold">{Math.round(profile.credits)}</span>
              </div>
              <div className="w-[48%] credits-block">
                <Link
                  className="font-bold bg-[#192449] hover:bg-[#83A873] rounded-3xl text-white w-[12rem] block  mx-auto px-3 py-2 flex-1 text-center"
                  href={"/payment-attempt"}
                >
                  Buy 10,000 Credits
                </Link>
              </div>
            </div>
          </div>
          <div className="text-sm text-[#7F8CA1] either-buy-credits px-5 pb-4">
            You can either buy credits or add your own API keys for Fireworks
            and OpenAI.
          </div>
        </div>

      )}

      <div className="flex flex-col p-5 space-y-3 bg-[#ffffff] border border-[#81878D] rounded-2xl">
        <div className="flex flex-col">
          <label htmlFor="fireworks-api-key" className="text-base font-semibold text-[#041D34]">
            Fireworks API Key:
          </label>
          <input
            type="text"
            id="fireworks-api-key"
            value={fireworksApiKey}
            onChange={(e) => setFireworksApiKey(e.target.value)}
            className="border border-[#ECECEC] bg-[#F5F5F5] text-[#0B3C68] rounded-md px-3 py-3  placeholder:text-[#BBBEC9] mt-2"
            placeholder="Enter your Fireworks API Key"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="openai-api-key" className="text-base font-semibold text-[#041D34]">
            OpenAI API Key:
          </label>
          <input
            type="text"
            id="openai-api-key"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            className="border border-[#ECECEC] bg-[#F5F5F5] text-[#0B3C68] rounded-md px-3 py-3  placeholder:text-[#BBBEC9] mt-2"
            placeholder="Enter your OpenAI API Key"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="openai-api-key" className="text-base font-semibold text-[#041D34]">
            Stability API Key:
          </label>
          <input
            type="text"
            id="stability-api-key"
            value={stabilityAPIKey}
            onChange={(e) => setStabilityAPIKey(e.target.value)}
            className="border border-[#ECECEC] bg-[#F5F5F5] text-[#0B3C68] rounded-md px-3 py-3  placeholder:text-[#BBBEC9] mt-2"
            placeholder="Enter your Stability API Key"
          />
        </div>
        <button
          onClick={handleApiKeyChange}
          disabled={
            fireworksApiKey === profile.fireworks_api_key &&
            openaiApiKey === profile.openai_api_key &&
            stabilityAPIKey === profile.stability_api_key
          }
          className="mt-2 w-56 font-bold bg-[#192449] hover:bg-[#83A873] rounded-3xl text-white px-3 py-2 disabled:opacity-50 mx-auto"
        >
          Update API Keys
        </button>
      </div>

      <div className="flex flex-col p-5 gap-2 bg-[#ffffff] border border-[#81878D] rounded-2xl">
        <div>
          <label htmlFor="toggle-use-credits" className="text-base font-semibold  text-[#0B3C68]">
            Use:
          </label>
        </div>
        <div className="credit-option relative">
          <select
            id="toggle-use-credits"
            value={useCredits ? "credits" : "apikeys"}
            onChange={handleCreditsChange}
            className="border border-[#ECECEC] text-[#BBBEC9] bg-[#F5F5F5] rounded-md px-3 py-3 appearance-none  w-full placeholder:text-[#BBBEC9]"
            disabled={!areApiKeysAvailable}
          >
            <option value="credits">Credits</option>
            {areApiKeysAvailable && <option value="apikeys">API Keys</option>}
          </select>
          <span className="line-bar relative before:content-[''] before:absolute before:top-2.5 before:right-8 before:bg-[#7F8CA1] before:h-[2px] before:px-[0.7rem] before:rotate-[89deg]"><i className="fas fa-angle-down absolute right-4 translate-y-[17px]  text-[#7F8CA1]"></i></span>
        </div>
      </div>
    </div>
  );
}
