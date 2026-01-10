import TextareaAutosize from "react-textarea-autosize";
import { Send } from "lucide-react";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";

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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full bg-background/80 backdrop-blur-lg border-t border-border p-4 md:p-6 pb-8 md:pb-8">
      <div className="max-w-4xl mx-auto relative">
        <div className="relative flex items-end gap-2 bg-muted border border-border rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-ring transition-all overflow-hidden">
          <TextareaAutosize
            className="w-full py-3.5 pl-4 pr-12 bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-hidden text-base leading-relaxed max-h-[200px]"
            placeholder="Ask me anything..."
            minRows={1}
            maxRows={8}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="absolute right-2 bottom-2">
            <button
              onClick={() => !isLoading && value.trim() && onSubmit()}
              disabled={isLoading || !value.trim()}
              className={`p-2 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                value.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
              aria-label="Send message"
            >
              {isLoading ? (
                <InlineSpinner size="sm" />
              ) : (
                <Send size={18} className={value.trim() ? "ml-0.5" : ""} />
              )}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
