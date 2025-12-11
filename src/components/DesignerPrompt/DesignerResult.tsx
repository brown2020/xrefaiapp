import Image from "next/image";
import { copyImageToClipboard, downloadImage } from "@/utils/clipboard";
import toast from "react-hot-toast";
import { Share2, Copy, Download } from "lucide-react";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";

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
      <div className="flex justify-center items-center py-8 gap-3">
        <InlineSpinner size="md" />
        <span className="text-[#041D34]">Generating your design...</span>
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
            unoptimized
          />

          <div className="flex justify-center gap-3 mt-4">
            <ActionButton
              onClick={() => toast.success("Share feature coming soon!")}
              icon={<Share2 size={18} className="text-[#7F8CA1]" />}
              label="Share"
            />
            <ActionButton
              onClick={() => copyImageToClipboard(summary)}
              icon={<Copy size={18} className="text-[#7F8CA1]" />}
              label="Copy"
            />
            <ActionButton
              onClick={() => downloadImage(summary)}
              icon={<Download size={18} className="text-[#7F8CA1]" />}
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
    <button
      type="button"
      className="p-2 w-9 h-9 border border-[#A3AEC0] rounded-[10px] text-center flex justify-center items-center cursor-pointer hover:bg-[#0A0F20] hover:text-white transition-colors"
      onClick={onClick}
      title={label}
    >
      {icon}
    </button>
  );
}
