"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import {
  FileText,
  PenTool,
  Wand2,
  Image as ImageIcon,
  Layout,
  AlignLeft,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Dynamic imports for code splitting
const SummarizeTopic = dynamic(() => import("./SummarizeTopic"), {
  loading: () => <ToolLoadingState />,
});
const SummarizeText = dynamic(() => import("./SummarizeText"), {
  loading: () => <ToolLoadingState />,
});
const FreestylePrompt = dynamic(() => import("./FreestylePrompt"), {
  loading: () => <ToolLoadingState />,
});
const SimplifyPrompt = dynamic(() => import("./SimplifyPrompt"), {
  loading: () => <ToolLoadingState />,
});
const ImagePrompt = dynamic(() => import("./ImagePrompt"), {
  loading: () => <ToolLoadingState />,
});
const DesignerPrompt = dynamic(() => import("./DesignerPrompt"), {
  loading: () => <ToolLoadingState />,
});

function ToolLoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="md" text="Loading tool..." />
    </div>
  );
}

type ToolKey =
  | "Summarize Website"
  | "Summarize Text"
  | "Freestyle Writing"
  | "Simplify Writing"
  | "Generate Image"
  | "Designer Tool";

const toolList: { title: ToolKey; icon: React.ReactNode }[] = [
  { title: "Summarize Website", icon: <FileText size={20} /> },
  { title: "Summarize Text", icon: <AlignLeft size={20} /> },
  { title: "Freestyle Writing", icon: <PenTool size={20} /> },
  { title: "Simplify Writing", icon: <Wand2 size={20} /> },
  { title: "Generate Image", icon: <ImageIcon size={20} /> },
  { title: "Designer Tool", icon: <Layout size={20} /> },
];

const toolComponents: Record<ToolKey, React.ComponentType> = {
  "Summarize Website": SummarizeTopic,
  "Summarize Text": SummarizeText,
  "Freestyle Writing": FreestylePrompt,
  "Simplify Writing": SimplifyPrompt,
  "Generate Image": ImagePrompt,
  "Designer Tool": DesignerPrompt,
};

export default function Tools() {
  const [selectedTool, setSelectedTool] =
    useState<ToolKey>("Summarize Website");

  const ToolComponent = toolComponents[selectedTool];

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] relative bg-gray-50/30 w-full overflow-hidden">
      <div className="flex flex-1 h-full max-w-7xl mx-auto w-full p-4 md:p-6 gap-6">
        {/* Sidebar / Tool Selector */}
        <div className="flex flex-col w-full md:w-64 lg:w-72 shrink-0 h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <h2 className="text-lg font-bold text-[#041D34]">Tools</h2>
            <p className="text-xs text-gray-500">
              Select a tool to get started
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {toolList.map((tool) => (
              <button
                key={tool.title}
                onClick={() => setSelectedTool(tool.title)}
                className={`w-full px-4 py-3 flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tool.title === selectedTool
                    ? "bg-[#192449] text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50 hover:text-[#192449]"
                }`}
              >
                <span
                  className={
                    tool.title === selectedTool ? "text-white" : "text-gray-400"
                  }
                >
                  {tool.icon}
                </span>
                <span className="truncate">{tool.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 h-full min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-white/80 backdrop-blur-xs sticky top-0 z-10">
            <h1 className="text-xl font-bold text-[#041D34]">{selectedTool}</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <Suspense fallback={<ToolLoadingState />}>
                <ToolComponent />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
