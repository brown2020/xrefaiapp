interface ProgressBarProps {
  progress: number;
  className?: string;
}

export function ProgressBar({ progress, className = "" }: ProgressBarProps) {
  return (
    <div
      className={`w-full mb-4 bg-gray-100 h-2 rounded-full overflow-hidden ${className}`}
    >
      <div
        className="bg-[#48B461] h-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
