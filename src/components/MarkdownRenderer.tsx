"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Memoized Markdown renderer to prevent unnecessary re-renders
 * Uses remark-gfm for GitHub Flavored Markdown support
 */
const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  const MAX_MARKDOWN_CHARS = 8000;
  const MAX_MARKDOWN_LINES = 400;
  const MAX_MARKDOWN_MARKERS = 300;
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
