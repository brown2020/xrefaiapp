// SummarizeTopic.tsx

import GenericPrompt from "./GenericPrompt";

export default function SummarizeTopic() {
  return (
    <GenericPrompt
      title="Summarize Topic"
      systemPrompt="Summarize this topic"
      promptPrefix="Summarize this topic"
      inputLabel="Topic"
      inputPlaceholder="Enter a topic to summarize."
    />
  );
}
