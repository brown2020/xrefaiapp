import TextareaAutosize from "react-textarea-autosize";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  isLoading: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  return (
    <div className="relative bg-[#ffffff] pt-4">
      <TextareaAutosize
        className="text_area w-full px-3 py-4 rounded-lg bg-[#ffffff] text-[#0B3C68] outline-hidden textarea placeholder-[#BBBEC9]"
        placeholder="Ask me anything!"
        minRows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && value.trim()) {
            e.preventDefault(); // Prevents adding a newline
            onSubmit();
          }
        }}
      />

      <button
        onClick={onSubmit}
        className={`absolute right-4 bottom-6 px-5 py-3 text-white bg-[#39509E] rounded-md transition-all duration-200 flex items-center justify-center ${
          isLoading || !value.trim()
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-[#2d407f] hover:shadow-md"
        }`}
        disabled={isLoading || !value.trim()}
        aria-label="Send message"
      >
        {isLoading ? (
          <span className="text-sm font-medium">Generating...</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        )}
      </button>
    </div>
  );
}
