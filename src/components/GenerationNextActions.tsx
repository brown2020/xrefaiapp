"use client";

import Link from "next/link";
import { History, Image as ImageIcon, MessageSquare } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { buildPrefilledHref } from "@/constants/starterIntents";

const MAX_PREFILL_CHARS = 900;

interface GenerationNextActionsProps {
  content: string;
  sourceLabel?: string;
  className?: string;
  showHistory?: boolean;
}

export default function GenerationNextActions({
  content,
  sourceLabel = "output",
  className = "",
  showHistory = true,
}: GenerationNextActionsProps) {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const excerpt =
    trimmed.length > MAX_PREFILL_CHARS
      ? `${trimmed.slice(0, MAX_PREFILL_CHARS)}...`
      : trimmed;

  const continuePrompt = [
    `Help me keep improving this ${sourceLabel}.`,
    "",
    excerpt,
  ].join("\n");

  const imagePrompt = [
    `Create a strong image prompt inspired by this ${sourceLabel}.`,
    "",
    excerpt,
  ].join("\n");

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Link
        href={buildPrefilledHref(ROUTES.chat, { prompt: continuePrompt })}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Continue in chat
      </Link>
      <Link
        href={buildPrefilledHref(ROUTES.tools, {
          tool: "Generate Image",
          prompt: imagePrompt,
        })}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <ImageIcon className="h-3.5 w-3.5" />
        Create image prompt
      </Link>
      {showHistory ? (
        <Link
          href={ROUTES.history}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <History className="h-3.5 w-3.5" />
          Open History
        </Link>
      ) : null}
    </div>
  );
}
