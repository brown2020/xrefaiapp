import Image from "next/image";
import { ReactNode } from "react";

export function BotAvatar() {
  return (
    <div className="shrink-0 w-10 h-10 rounded-full bg-[#0A0F20] flex items-center justify-center overflow-hidden shadow-sm border border-gray-100 p-1">
      <Image
        src="/logo(X).png"
        alt="AI"
        width={32}
        height={32}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

interface BotHeaderProps {
  children?: ReactNode;
}

export function BotHeader({ children }: BotHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="font-semibold text-sm text-gray-900">XREF.AI</span>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] text-white">
        Bot
      </span>
      {children}
    </div>
  );
}

interface BotMessageWrapperProps {
  children: ReactNode;
  header?: ReactNode;
}

export function BotMessageWrapper({
  children,
  header,
}: BotMessageWrapperProps) {
  return (
    <div className="flex w-full justify-start mb-6">
      <div className="flex max-w-[95%] md:max-w-[85%] gap-4 items-start">
        <BotAvatar />
        <div className="flex flex-col flex-1 min-w-0">
          <BotHeader>{header}</BotHeader>
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-6 py-5 shadow-sm text-gray-800">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}


