"use client";

import { useState } from "react";
import { Typewriter } from "react-simple-typewriter";
import AuthComponent from "@/components/AuthComponent";

export default function Home() {
  const [showNotice, setShowNotice] = useState(true); // State to manage the notice visibility

  return (
    <div className="flex flex-col h-full p-5 items-center justify-center mx-auto my-12 max-w-lg space-y-10">
      {/* Dismissible Notice */}
      {showNotice && (
        <div className="relative p-4 text-center text-white bg-blue-500 rounded-md w-full">
          <p className="text-lg font-semibold">
            We are moving from a subscription model to a pay-as-you-go model.
          </p>
          <p className="text-sm mt-2">
            If you are a previous paying subscriber, we have stopped your
            billing and added <strong>$99.99</strong> of credits to your
            account.
          </p>
          {/* Dismiss Button */}
          <button
            onClick={() => setShowNotice(false)}
            className="absolute top-1 right-3 text-white font-bold"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex flex-col text-center">
        <h1 className="px-10 py-5 mx-auto text-5xl text-white bg-orange-500 w-fit">
          XREF.AI
        </h1>

        <h3 className="my-7 text-xl">What would you like to create today?</h3>

        <h3 className="h-20 text-2xl">
          <Typewriter
            loop={false}
            words={[
              "Topic summaries",
              "Blog posts",
              "Newsletters",
              "Travel logs",
              "Website content",
              "Essay paragraphs",
              "Homework help",
              "Descriptions",
              "Product info",
              "Social media posts",
              "Useful Tweets",
              "Instagram captions",
              "Marketing content",
            ]}
          />
        </h3>
        <br />

        <AuthComponent />
      </div>
    </div>
  );
}
