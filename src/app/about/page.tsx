import {
  PublicContentSection,
  PublicPageLayout,
} from "@/components/PublicPageLayout";

const principles = [
  "Clear tools instead of cluttered prompt boxes.",
  "Credit-based usage so costs stay visible.",
  "Account controls for saved content, model choice, and provider keys.",
  "Security patterns built around verified auth, rate limits, and guarded payments.",
] as const;

export default function About() {
  return (
    <PublicPageLayout
      eyebrow="About"
      title="Xref.ai is a focused AI workspace for writing, chat, and image ideas."
      description="The app brings practical generation tools into one account: writing helpers, chat, summarization, design prompts, image generation, saved history, and flexible credits."
    >
      <PublicContentSection title="What We Are Building">
        <p>
          Xref.ai is designed for people who move between research, notes,
          drafts, revisions, and publishing. The goal is to keep the creative
          loop compact: bring an idea or reference, choose a tool, generate a
          useful starting point, then refine it.
        </p>
        <p>
          The product supports both credit-based AI usage and user-provided API
          keys, giving creators a simple path to get started and more control
          when they need it.
        </p>
      </PublicContentSection>

      <PublicContentSection title="Core Tools">
        <ul className="list-disc pl-5">
          <li>Writing tools for drafts, rewrites, summaries, and simplification.</li>
          <li>AI chat for exploring ideas and saving useful exchanges.</li>
          <li>Image generation for visual concepts and creative prompts.</li>
          <li>Saved history so useful work remains available in your account.</li>
        </ul>
      </PublicContentSection>

      <PublicContentSection title="Product Principles">
        <ul className="list-disc pl-5">
          {principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </PublicContentSection>
    </PublicPageLayout>
  );
}
