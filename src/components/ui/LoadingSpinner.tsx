import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
}

const sizes = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 80,
};

export function LoadingSpinner({
  size = "md",
  className = "",
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <Loader2 size={sizes[size]} className="animate-spin text-[#192449]" />
      {text && <p className="font-medium text-gray-500">{text}</p>}
    </div>
  );
}

export function InlineSpinner({ size = "sm" }: { size?: "sm" | "md" }) {
  return <Loader2 size={sizes[size]} className="animate-spin" />;
}






