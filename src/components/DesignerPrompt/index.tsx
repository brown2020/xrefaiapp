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
      {!thinking && !Boolean(prompt) && (
        <h3 className="text-4xl sm:text-4xl md:text-4xl chnage_title font-extrabold my-2 text-center">
          <span className="bg-linear-to-r from-[#9C26D7] to-[#1EB1DB] bg-clip-text text-transparent">
            What would you like to visualize today?
          </span>
        </h3>
      )}

      <DesignerForm onSubmit={handleSubmit} active={active} />
      <DesignerResult summary={summary} flagged={flagged} thinking={thinking} />
    </div>
  );
}
