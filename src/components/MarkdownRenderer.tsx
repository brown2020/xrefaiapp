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
  const MAX_MARKDOWN_CHARS = 20000;
  const safeContent =
    typeof content === "string" ? content : String(content ?? "");

  if (safeContent.length > MAX_MARKDOWN_CHARS) {
    return <div className="whitespace-pre-wrap">{safeContent}</div>;
  }

  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{safeContent}</ReactMarkdown>;
});

export default MarkdownRenderer;
