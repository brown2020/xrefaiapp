"use client";

import { CopyButton } from "./CopyButton";

interface ResponseDisplayProps {
  flagged: string;
  summary: string;
  children?: React.ReactNode;
  nextActions?: React.ReactNode;
}

export function ResponseDisplay({
  flagged,
  summary,
  children,
  nextActions,
}: ResponseDisplayProps) {
  if (flagged) {
    return (
      <div
        id="flagged"
        role="alert"
        className="p-3 bg-destructive/10 text-destructive my-3 rounded-md text-sm"
      >
        {flagged}
      </div>
    );
  }

  if (summary) {
    return (
      <div id="response" className="my-4">
        {children || (
          <div className="bg-muted/50 text-foreground rounded-lg p-4 border border-border">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CopyButton text={summary} size={14} />
              {nextActions}
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {summary}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
