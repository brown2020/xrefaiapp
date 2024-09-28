"use client";

import { useState } from "react";
import SummarizeTopic from "./SummarizeTopic";
import FreestylePrompt from "./FreestylePrompt";
import SimplifyPrompt from "./SimplifyPrompt";
import ImagePrompt from "./ImagePrompt";
import DesignerPrompt from "./DesignerPrompt";

export default function Tools() {
  const [selectedTool, setSelectedTool] = useState<string>("Summarize Writing");

  const toolList = [
    "Summarize Writing",
    "Freestyle Writing",
    "Simplify Writing",
    "Generate Image",
    "Designer Tool",
  ];
  window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="flex flex-col space-y-5 p-5">
      <div className="flex flex-wrap items-center text-sm sm:text-base">
        {toolList.map((tool) => (
          <div
            key={tool}
            onClick={() => setSelectedTool(tool)}
            className={`px-2 sm:px-3 py-2 mb-2 mr-2 rounded-md cursor-pointer ${
              tool === selectedTool
                ? "bg-orange-500 text-white"
                : "bg-orangeLight text-black"
            }`}
          >
            {tool}
          </div>
        ))}
      </div>

      <div>
        {selectedTool === "Summarize Writing" && <SummarizeTopic />}
        {selectedTool === "Freestyle Writing" && <FreestylePrompt />}
        {selectedTool === "Simplify Writing" && <SimplifyPrompt />}
        {selectedTool === "Generate Image" && <ImagePrompt />}
        {selectedTool === "Designer Tool" && <DesignerPrompt />}
      </div>
    </div>
  );
}
