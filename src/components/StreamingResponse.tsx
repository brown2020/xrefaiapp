import Image from "next/image";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Loader2 } from "lucide-react";

interface StreamingResponseProps {
  content: string;
}

export default function StreamingResponse({ content }: StreamingResponseProps) {
  return (
    <div className="flex w-full justify-start mb-6">
      <div className="flex max-w-[95%] md:max-w-[85%] gap-4 items-start">
        <div className="shrink-0 w-10 h-10 rounded-full bg-[#0A0F20] flex items-center justify-center overflow-hidden shadow-sm border border-gray-100 p-1">
          <Image
            src="/logo(X).png"
            alt="AI"
            width={32}
            height={32}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-semibold text-sm text-gray-900">XREF.AI</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] text-white">
              Bot
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-2">
              <Loader2 size={12} className="animate-spin" />
              Generating...
            </span>
          </div>

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
