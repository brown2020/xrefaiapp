import MarkdownRenderer from "@/components/MarkdownRenderer";
import { BotMessageWrapper } from "@/components/ui/BotMessage";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";

interface StreamingResponseProps {
  content: string;
}

export default function StreamingResponse({ content }: StreamingResponseProps) {
  return (
    <BotMessageWrapper
      header={
        <span className="flex items-center gap-1 text-xs text-gray-400 ml-2">
          <InlineSpinner size="sm" />
          Generating...
        </span>
      }
    >
      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:p-0">
        <MarkdownRenderer content={content || ""} />
        {!content && <span className="animate-pulse">▌</span>}
      </div>
    </BotMessageWrapper>
  );
}
