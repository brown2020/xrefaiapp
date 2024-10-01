// SimplifyPrompt.tsx

import GenericPrompt from "./GenericPrompt";

export default function SimplifyPrompt() {
  return (
    <GenericPrompt
      title="Simplify Writing"
      systemPrompt="Simplify this topic"
      promptPrefix="Simplify this text"
      inputLabel="Text"
      inputPlaceholder="Enter a paragraph to simplify."
      isTextArea={true}
    />
  );
}
