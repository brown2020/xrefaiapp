import Image from "next/image";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { ChatType } from "@/types/ChatType";
import { User } from "lucide-react";
import { BotAvatar, BotHeader } from "@/components/ui/BotMessage";
import { CopyButton } from "@/components/ui/CopyButton";

interface ChatMessageProps {
  message: ChatType;
  profilePhoto: string;
  isUser: boolean;
}

export default function ChatMessage({
  message,
  profilePhoto,
  isUser,
}: ChatMessageProps) {
  if (isUser) {
    return (
      <div className="flex w-full justify-end mb-6">
        <div className="flex max-w-[85%] md:max-w-[75%] gap-3 items-start flex-row-reverse">
          <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100">
            {profilePhoto ? (
              <Image
                src={profilePhoto}
                alt="User"
                height={40}
                width={40}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <User size={20} />
              </div>
            )}
          </div>

          <div className="flex flex-col items-end">
            <div className="px-5 py-3.5 bg-[#2563EB] text-white rounded-2xl rounded-tr-sm shadow-sm text-left">
              <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">
                {message.prompt}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start mb-6">
      <div className="flex max-w-[95%] md:max-w-[85%] gap-4 items-start">
        <BotAvatar />

        <div className="flex flex-col flex-1 min-w-0">
          <BotHeader />

          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-6 py-5 shadow-sm text-gray-800">
            <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:p-0">
              <MarkdownRenderer content={message.response} />
            </div>

            <div className="mt-4 flex justify-start pt-3 border-t border-gray-50">
              <CopyButton text={message.response} successMessage="Response copied!" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
