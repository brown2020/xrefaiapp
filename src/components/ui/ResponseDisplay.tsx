"use client";

import { copyToClipboard } from "@/utils/clipboard";

interface ResponseDisplayProps {
  flagged: string;
  summary: string;
  /** Optional: render custom content instead of default text display */
  children?: React.ReactNode;
}

export function ResponseDisplay({
  flagged,
  summary,
  children,
}: ResponseDisplayProps) {
  if (flagged) {
    return (
      <h3 id="flagged" className="p-3 bg-red-100 text-red-800 my-3 rounded-md">
        {flagged}
      </h3>
    );
  }

  if (summary) {
    return (
      <div id="response">
        {children || (
          <h3
            className="cursor-pointer response bg-[#E7EAEF] text-[#0B3C68]"
            onClick={() => copyToClipboard(summary)}
          >
            {summary}
          </h3>
        )}
      </div>
    );
  }

  return null;
}
