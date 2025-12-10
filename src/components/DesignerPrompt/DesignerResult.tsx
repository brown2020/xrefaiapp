import Image from "next/image";
import { copyImageToClipboard, downloadImage } from "@/utils/clipboard";
import toast from "react-hot-toast";

interface DesignerResultProps {
  summary: string;
  flagged: string;
  thinking: boolean;
}

export function DesignerResult({
  summary,
  flagged,
  thinking,
}: DesignerResultProps) {
  if (thinking) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#192449]"></div>
        <span className="ml-3 text-[#041D34]">Generating your design...</span>
      </div>
    );
  }

  if (flagged) {
    return (
      <div
        id="flagged"
        className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"
      >
        <p className="text-red-700">{flagged}</p>
      </div>
    );
  }

  if (summary) {
    return (
      <div id="response" className="mt-6">
        <div className="relative">
          <Image
            src={summary}
            alt="Generated design"
            width={500}
            height={500}
            className="w-full max-w-md mx-auto rounded-lg shadow-lg"
          />

          <div className="flex justify-center gap-3 mt-4">
            <ActionButton
              onClick={() => toast.success("Share feature coming soon!")}
              icon={<ShareIcon />}
              label="Share"
            />
            <ActionButton
              onClick={() => copyImageToClipboard(summary)}
              icon={<CopyIcon />}
              label="Copy"
            />
            <ActionButton
              onClick={() => downloadImage(summary)}
              icon={<DownloadIcon />}
              label="Download"
            />
          </div>
        </div>

        <p className="disclaimer text-[#041D34] mt-4 text-sm text-center">
          <span className="text-red-500">*</span>
          I&apos;m a new AI and I&apos;m still learning, so these results might
          have inaccuracies.
        </p>
      </div>
    );
  }

  return null;
}

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ActionButton({ onClick, icon, label }: ActionButtonProps) {
  return (
    <div
      className="p-2 w-9 h-9 border border-[#A3AEC0] rounded-[10px] text-center flex justify-center items-center cursor-pointer hover:bg-[#0A0F20] transition-colors"
      onClick={onClick}
      title={label}
    >
      {icon}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 25 25"
      fill="none"
    >
      <g clipPath="url(#clip0_59_140)">
        <path
          d="M12.5002 24.8674C9.90945 24.8674 7.31808 24.8731 4.72734 24.8655C2.78635 24.8598 1.19815 23.5476 0.86186 21.6403C0.769221 21.1149 0.798408 20.566 0.791429 20.0279C0.783815 19.4258 0.772393 18.8211 0.810464 18.2208C0.84917 17.6117 1.34663 17.1352 1.93546 17.073C2.55856 17.007 3.12455 17.3592 3.31237 17.9537C3.36821 18.1307 3.38153 18.3268 3.38343 18.5146C3.39105 19.2868 3.38343 20.0584 3.38788 20.8306C3.39295 21.738 3.9215 22.2672 4.8295 22.2678C9.93737 22.2697 15.0452 22.2697 20.1531 22.2678C21.0611 22.2678 21.5795 21.7386 21.5808 20.823C21.5827 19.9981 21.5713 19.1732 21.5852 18.3484C21.5966 17.6853 22.0998 17.1403 22.7286 17.073C23.3879 17.0026 23.9672 17.3998 24.141 18.0406C24.1468 18.0609 24.1607 18.0806 24.1601 18.1009C24.1353 19.3452 24.2565 20.6155 24.0484 21.8287C23.7331 23.6688 22.1138 24.8617 20.2413 24.8668C17.6614 24.8725 15.0808 24.8674 12.5002 24.8674Z"
          fill="white"
        />
      </g>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"
        fill="#7F8CA1"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 515.283 515.283"
    >
      <path
        d="M400.775 515.283H114.507c-30.584 0-59.339-11.911-80.968-33.54C11.911 460.117 0 431.361 0 400.775v-28.628c0-15.811 12.816-28.628 28.627-28.628s28.627 12.817 28.627 28.628v28.628c0 15.293 5.956 29.67 16.768 40.483 10.815 10.814 25.192 16.771 40.485 16.771h286.268c15.292 0 29.669-5.957 40.483-16.771 10.814-10.815 16.771-25.192 16.771-40.483v-28.628c0-15.811 12.816-28.628 28.626-28.628s28.628 12.817 28.628 28.628v28.628c0 30.584-11.911 59.338-33.54 80.968-21.629 21.629-50.384 33.54-80.968 33.54zM257.641 400.774a28.538 28.538 0 0 1-19.998-8.142l-.002-.002-.057-.056-.016-.016c-.016-.014-.03-.029-.045-.044l-.029-.029a.892.892 0 0 0-.032-.031l-.062-.062-114.508-114.509c-11.179-11.179-11.179-29.305 0-40.485 11.179-11.179 29.306-11.18 40.485 0l65.638 65.638V28.627C229.014 12.816 241.83 0 257.641 0s28.628 12.816 28.628 28.627v274.408l65.637-65.637c11.178-11.179 29.307-11.179 40.485 0 11.179 11.179 11.179 29.306 0 40.485L277.883 392.39l-.062.062-.032.031-.029.029c-.014.016-.03.03-.044.044l-.017.016a1.479 1.479 0 0 1-.056.056l-.002.002c-.315.307-.634.605-.96.895a28.441 28.441 0 0 1-7.89 4.995l-.028.012c-.011.004-.02.01-.031.013a28.5 28.5 0 0 1-11.091 2.229z"
        fill="#7F8CA1"
      />
    </svg>
  );
}
