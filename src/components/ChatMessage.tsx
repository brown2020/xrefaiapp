import Image from "next/image";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { copyToClipboard } from "@/utils/copyToClipboard";
import { ChatType } from "@/types/ChatType";

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
      <div className="flex justify-end max-w-5xl ml-auto rounded-xl gap-4 items-center p-4 text-right bg-[#F0F6FF]">
        <div className="text-[#A1ADF4] whitespace-pre-wrap rounded-md">
          <p className="text-[#041D34] font-bold">You</p>
          <p className="break-word text-[#0B3C68] font-normal">
            {message.prompt}
          </p>
        </div>
        <div className="flex items-center justify-center shrink-0 w-10 h-10 text-xs font-bold text-white rounded-full bg-blue-500">
          <Image
            src={profilePhoto}
            alt=""
            height={100}
            width={100}
            className="object-cover rounded-full"
          />
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col max-w-5xl p-4 gap-4 rounded-xl text-left bg-[#E7EAEF]">
        <div className="flex w-full gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-[#0A0F20]">
            <Image
              src="/logo(X).png"
              alt="bot"
              className="shrink-0 object-contain w-10 h-10 rounded-full px-[5px]"
              width={40}
              height={40}
            />
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <div className="flex gap-3 items-center">
              <h3 className="m-0 text-[#041D34] font-bold">XREF.AI</h3>
              <p className="px-[10px] py-0 text-[12px] rounded-[10px] bg-linear-to-r from-[#9C26D7] to-[#1EB1DB] text-white ">
                Bot
              </p>
            </div>
            <button
              className="copy_icon p-2 ml-3 w-9 h-9 border border-[#A3AEC0] rounded-[10px] text-center flex justify-center items-center cursor-pointer hover:bg-[#83A873]"
              onClick={() => copyToClipboard(message.response)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                x="0"
                y="0"
                viewBox="0 0 48 48"
                className=""
              >
                <g>
                  <path
                    d="M33.46 28.672V7.735c0-2.481-2.019-4.5-4.5-4.5H8.023a4.505 4.505 0 0 0-4.5 4.5v20.937c0 2.481 2.019 4.5 4.5 4.5H28.96c2.481 0 4.5-2.019 4.5-4.5zm-26.937 0V7.735c0-.827.673-1.5 1.5-1.5H28.96c.827 0 1.5.673 1.5 1.5v20.937c0 .827-.673 1.5-1.5 1.5H8.023c-.827 0-1.5-.673-1.5-1.5zm33.454-13.844h-3.646a1.5 1.5 0 1 0 0 3h3.646c.827 0 1.5.673 1.5 1.5v20.937c0 .827-.673 1.5-1.5 1.5H19.041c-.827 0-1.5-.673-1.5-1.5v-4.147a1.5 1.5 0 1 0-3 0v4.147c0 2.481 2.019 4.5 4.5 4.5h20.936c2.481 0 4.5-2.019 4.5-4.5V19.328c0-2.481-2.019-4.5-4.5-4.5z"
                    fill="#000000"
                    opacity="1"
                    data-original="#000000"
                    className="fill-[#7F8CA1]"
                  ></path>
                </g>
              </svg>
            </button>
          </div>
        </div>
        <div className="text-[#0B3C68] whitespace-pre-wrap w-full text-section-ai pb-4">
          <MarkdownRenderer content={message.response} />
        </div>
      </div>
    );
  }
}
