"use client";

import { Typewriter } from "react-simple-typewriter";
import AuthComponent from "@/components/AuthComponent"; // Import the new AuthComponent for sign in

export default function Home() {
  return (
    <div className="flex flex-col h-full p-5 items-center justify-center mx-auto my-12 max-h-96  max-w-lg space-y-10 border rounded-md  border-gray-300">
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
