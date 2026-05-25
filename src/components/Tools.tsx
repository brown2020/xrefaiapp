"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import {
  FileText,
  PenTool,
  Wand2,
  Image as ImageIcon,
  Layout,
  AlignLeft,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  TOOL_GUIDES,
  type ToolGuide,
  type ToolKey,
} from "@/constants/toolMetadata";
import { getStarterIntentById } from "@/constants/starterIntents";
import type { ToolInitialProps } from "@/types/ToolInitialProps";

// Dynamic imports for code splitting
const SummarizeTopic = dynamic<ToolInitialProps>(
  () => import("./SummarizeTopic"),
  {
    loading: () => <ToolLoadingState />,
  }
);
const SummarizeText = dynamic<ToolInitialProps>(
  () => import("./SummarizeText"),
  {
    loading: () => <ToolLoadingState />,
  }
);
const FreestylePrompt = dynamic<ToolInitialProps>(
  () => import("./FreestylePrompt"),
  {
    loading: () => <ToolLoadingState />,
  }
);
const SimplifyPrompt = dynamic<ToolInitialProps>(
  () => import("./SimplifyPrompt"),
  {
    loading: () => <ToolLoadingState />,
  }
);
const ImagePrompt = dynamic<ToolInitialProps>(() => import("./ImagePrompt"), {
  loading: () => <ToolLoadingState />,
});
const DesignerPrompt = dynamic<ToolInitialProps>(
  () => import("./DesignerPrompt"),
  {
    loading: () => <ToolLoadingState />,
  }
);

function ToolLoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="md" text="Loading tool..." />
    </div>
  );
}

const toolList: { title: ToolKey; icon: React.ReactNode }[] = [
  { title: "Summarize Website", icon: <FileText size={20} /> },
  { title: "Summarize Text", icon: <AlignLeft size={20} /> },
  { title: "Freestyle Writing", icon: <PenTool size={20} /> },
  { title: "Simplify Writing", icon: <Wand2 size={20} /> },
  { title: "Generate Image", icon: <ImageIcon size={20} /> },
  { title: "Designer Tool", icon: <Layout size={20} /> },
];

const toolComponents: Record<ToolKey, ComponentType<ToolInitialProps>> = {
  "Summarize Website": SummarizeTopic,
  "Summarize Text": SummarizeText,
  "Freestyle Writing": FreestylePrompt,
  "Simplify Writing": SimplifyPrompt,
  "Generate Image": ImagePrompt,
  "Designer Tool": DesignerPrompt,
};

interface ToolsProps extends ToolInitialProps {
  initialTool?: ToolKey;
}

export default function Tools({
  initialTool = "Summarize Website",
  initialInput,
  initialFocus,
  initialWords,
  starterIntentId,
}: ToolsProps) {
  const [selectedTool, setSelectedTool] =
    useState<ToolKey>(initialTool);

  const ToolComponent = toolComponents[selectedTool];
  const selectedGuide = TOOL_GUIDES[selectedTool];
  const starterIntent = getStarterIntentById(starterIntentId);
  const shouldUseInitialProps = selectedTool === initialTool;
  const prefillKey = useMemo(
    () =>
      [
        starterIntentId ?? "manual",
        initialTool,
        initialInput ?? "",
        initialFocus ?? "",
        initialWords ?? "",
      ].join(":"),
    [initialFocus, initialInput, initialTool, initialWords, starterIntentId]
  );

  useEffect(() => {
    setSelectedTool(initialTool);
  }, [initialTool, prefillKey]);

  return (
    <div className="flex flex-col h-full relative bg-muted/30 w-full overflow-hidden">
      <div className="flex flex-1 min-h-0 max-w-7xl mx-auto w-full p-4 md:p-6 gap-4 md:gap-6 flex-col md:flex-row">
        {/* Sidebar / Tool Selector */}
        <div className="flex flex-col w-full md:w-64 lg:w-72 shrink-0 h-auto md:h-full bg-card text-card-foreground rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Tools</h2>
            <p className="text-xs text-muted-foreground">
              Select a tool to get started
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-y-auto md:space-y-2 md:gap-0">
            {toolList.map((tool) => (
              <button
                key={tool.title}
                onClick={() => setSelectedTool(tool.title)}
                className={`min-w-[11rem] md:min-w-0 md:w-full px-4 py-3 flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tool.title === selectedTool
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span
                  className={
                    tool.title === selectedTool
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
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
        <div className="flex-1 h-full min-w-0 bg-card text-card-foreground rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border bg-background/80 backdrop-blur-xs sticky top-0 z-10">
            <h1 className="text-xl font-bold text-foreground">{selectedTool}</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              {starterIntent ? (
                <StarterIntentBanner
                  audience={starterIntent.audience}
                  title={starterIntent.title}
                  description={starterIntent.description}
                />
              ) : null}
              <ToolGuidePanel guide={selectedGuide} />
              <Suspense fallback={<ToolLoadingState />}>
                <ToolComponent
                  key={`${selectedTool}-${
                    shouldUseInitialProps ? prefillKey : "manual"
                  }`}
                  initialInput={shouldUseInitialProps ? initialInput : undefined}
                  initialFocus={shouldUseInitialProps ? initialFocus : undefined}
                  initialWords={shouldUseInitialProps ? initialWords : undefined}
                  starterIntentId={
                    shouldUseInitialProps ? starterIntentId : undefined
                  }
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StarterIntentBanner({
  audience,
  title,
  description,
}: {
  audience: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 rounded-lg border border-accent/40 bg-accent/10 p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
        {audience} starter
      </div>
      <h2 className="mt-2 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function ToolGuidePanel({ guide }: { guide: ToolGuide }) {
  return (
    <div className="mb-5 rounded-lg border border-border bg-muted/40 p-4">
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <GuideItem label="Expected input" value={guide.expectedInput} />
        <GuideItem label="Example input" value={guide.exampleInput} />
        <GuideItem label="Estimated cost" value={guide.estimatedCreditCost} />
        <GuideItem label="Likely output" value={guide.likelyOutput} />
      </div>
    </div>
  );
}

function GuideItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <p className="mt-1 leading-6 text-foreground">{value}</p>
    </div>
  );
}
