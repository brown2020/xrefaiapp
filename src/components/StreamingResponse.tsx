import Image from "next/image";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface StreamingResponseProps {
  content: string;
}

export default function StreamingResponse({ content }: StreamingResponseProps) {
  return (
    <div className="max-w-5xl p-2 bg-[#E7EAEF] text-[#0B3C68] whitespace-pre-wrap rounded-md text-section-ai">
      <div className="flex mb-2 gap-4">
        <div className="flex gap-3 items-center">
          <div className="shrink-0 w-10 h-10 rounded-full bg-[#0A0F20]">
            <Image
              src="/logo(X).png"
              alt="bot"
              className="shrink-0 object-contain w-10 h-10 rounded-full px-[5px]"
              width={40}
              height={40}
            />
          </div>
          <h3 className="m-0 text-[#0B3C68] font-bold">XREF.AI</h3>
          <p className="px-[10px] py-0 text-[12px] rounded-[10px] bg-linear-to-r from-[#9C26D7] to-[#1EB1DB] text-white ">
            Bot
          </p>
        </div>
      </div>
      <MarkdownRenderer content={content || "Generating response..."} />
    </div>
  );
}
