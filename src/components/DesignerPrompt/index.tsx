import { useAuthStore } from "@/zustand/useAuthStore";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useScrollToResult } from "@/hooks/useScrollToResult";
import { DesignerForm } from "./DesignerForm";
import { DesignerResult } from "./DesignerResult";
import type { ToolInitialProps } from "@/types/ToolInitialProps";

export default function DesignerPrompt({ initialInput }: ToolInitialProps) {
  const uid = useAuthStore((state) => state.uid);
  const { summary, flagged, active, thinking, handleSubmit } =
    useImageGeneration(uid);

  // Auto-scroll to response or flagged content
  useScrollToResult(summary, flagged);

  return (
    <div className="form-wrapper">
      <DesignerForm
        onSubmit={handleSubmit}
        active={active}
        initialTopic={initialInput}
      />
      <DesignerResult summary={summary} flagged={flagged} thinking={thinking} />
    </div>
  );
}
