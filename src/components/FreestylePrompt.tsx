// FreestylePrompt.tsx

import GenericPrompt from "./GenericPrompt";

export default function FreestylePrompt() {
  return (
    <GenericPrompt
      title="Freestyle Writing"
      systemPrompt="Freestyle response"
      promptPrefix="Respond freely to this prompt"
      inputLabel="Prompt"
      inputPlaceholder="Enter your freestyle prompt."
      isTextArea={true}
    />
  );
}
