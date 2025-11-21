import { useEffect } from 'react';
import { useAuthStore } from '@/zustand/useAuthStore';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { DesignerForm } from './DesignerForm';
import { DesignerResult } from './DesignerResult';

export default function DesignerPrompt() {
  const uid = useAuthStore((state) => state.uid);
  const {
    prompt,
    summary,
    flagged,
    active,
    thinking,
    handleSubmit
  } = useImageGeneration(uid);

  // Auto-scroll to relevant sections
  useEffect(() => {
    if (summary) {
      document.getElementById("response")?.scrollIntoView({ behavior: "smooth" });
    } else if (prompt) {
      document.getElementById("prompt")?.scrollIntoView({ behavior: "smooth" });
    } else if (flagged) {
      document.getElementById("flagged")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [summary, prompt, flagged]);

  return (
    <div className="form-wrapper">
      <DesignerForm onSubmit={handleSubmit} active={active} />
      <DesignerResult summary={summary} flagged={flagged} thinking={thinking} />
    </div>
  );
}
