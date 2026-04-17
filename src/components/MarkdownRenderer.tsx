"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MAX_MARKDOWN_CHARS,
  MAX_MARKDOWN_LINES,
  MAX_MARKDOWN_MARKERS,
} from "@/constants";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Memoized Markdown renderer to prevent unnecessary re-renders.
 * Falls back to plain text rendering for very large inputs so the parser
 * doesn't block the main thread during streaming.
 */
const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  const safeContent =
    typeof content === "string" ? content : String(content ?? "");

  const lineCount = safeContent.split("\n").length;
  const markerCount = (safeContent.match(/(^|\n)\s*(?:[-*+]|\d+\.)\s+/g) || [])
    .length;

  const shouldBypassMarkdown =
    safeContent.length > MAX_MARKDOWN_CHARS ||
    lineCount > MAX_MARKDOWN_LINES ||
    markerCount > MAX_MARKDOWN_MARKERS;

  if (shouldBypassMarkdown) {
    return (
      <div className="whitespace-pre-wrap wrap-break-word">{safeContent}</div>
    );
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{safeContent}</ReactMarkdown>
  );
});

export default MarkdownRenderer;
