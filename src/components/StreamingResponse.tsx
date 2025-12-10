import MarkdownRenderer from "@/components/MarkdownRenderer";
import { BotAvatar, BotHeader } from "@/components/ui/BotMessage";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";

interface StreamingResponseProps {
  content: string;
}

export default function StreamingResponse({ content }: StreamingResponseProps) {
  return (
    <div className="flex w-full justify-start mb-6">
      <div className="flex max-w-[95%] md:max-w-[85%] gap-4 items-start">
        <BotAvatar />

        <div className="flex flex-col flex-1 min-w-0">
          <BotHeader>
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-2">
              <InlineSpinner size="sm" />
              Generating...
            </span>
          </BotHeader>

          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-6 py-5 shadow-sm text-gray-800">
            <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:p-0">
              <MarkdownRenderer content={content || ""} />
              {!content && <span className="animate-pulse">▌</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
