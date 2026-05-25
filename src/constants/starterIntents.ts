import { ROUTES } from "@/constants/routes";
import type { ToolKey } from "@/constants/toolMetadata";
import { CREDITS_COSTS, getTextGenerationCreditsCost } from "@/constants/credits";

export type StarterAudience = "Creator" | "Marketer" | "Student" | "Researcher";
export type StarterDestination = typeof ROUTES.chat | typeof ROUTES.tools;

export interface StarterIntent {
  id: string;
  audience: StarterAudience;
  title: string;
  description: string;
  route: StarterDestination;
  tool?: ToolKey;
  prompt?: string;
  focus?: string;
  words?: number;
  expectedInput: string;
  likelyOutput: string;
  estimatedCredits: number;
}

const creatorSocialPrompt =
  "Write 5 social media caption options for [topic or offer]. Include a strong hook, one playful version, one helpful version, and a clear call to action.";

const marketerLaunchPrompt =
  "Write a concise launch email for [product or service] to [audience]. Include a subject line, opening hook, three benefits, and one clear call to action.";

const studentStudyPrompt =
  "Create a study guide for [topic]. Include key concepts, simple definitions, a short summary, and 5 quiz questions.";

export const STARTER_INTENTS = [
  {
    id: "creator-social-captions",
    audience: "Creator",
    title: "Draft social captions",
    description:
      "Turn a rough content idea into hooks, captions, and a clear next step.",
    route: ROUTES.tools,
    tool: "Freestyle Writing",
    prompt: creatorSocialPrompt,
    words: 160,
    expectedInput: "Topic, video idea, product, offer, or announcement.",
    likelyOutput: "Multiple caption options with hooks and calls to action.",
    estimatedCredits: getTextGenerationCreditsCost(160),
  },
  {
    id: "marketer-launch-email",
    audience: "Marketer",
    title: "Write a launch email",
    description:
      "Start a polished campaign email from a product, audience, and offer.",
    route: ROUTES.tools,
    tool: "Freestyle Writing",
    prompt: marketerLaunchPrompt,
    words: 180,
    expectedInput: "Product or service, audience, key benefit, and offer.",
    likelyOutput: "A subject line and ready-to-edit launch email.",
    estimatedCredits: getTextGenerationCreditsCost(180),
  },
  {
    id: "student-study-guide",
    audience: "Student",
    title: "Build a study guide",
    description:
      "Move from a broad topic to definitions, concepts, and quiz questions.",
    route: ROUTES.chat,
    prompt: studentStudyPrompt,
    expectedInput: "Class topic, textbook section, notes, or exam theme.",
    likelyOutput: "A study guide with key ideas and practice questions.",
    estimatedCredits: CREDITS_COSTS.chatMessage,
  },
  {
    id: "researcher-source-summary",
    audience: "Researcher",
    title: "Summarize a source",
    description:
      "Pull the main claims, evidence, and caveats from a reference URL.",
    route: ROUTES.tools,
    tool: "Summarize Website",
    focus: "Summarize the main claims, evidence, limitations, and useful follow-up questions.",
    words: 140,
    expectedInput: "A public HTTPS article, paper page, report, or reference URL.",
    likelyOutput: "A focused source summary with claims and caveats.",
    estimatedCredits: getTextGenerationCreditsCost(140),
  },
] as const satisfies readonly StarterIntent[];

export function getStarterIntentById(
  value: string | undefined
): StarterIntent | undefined {
  if (!value) return undefined;
  return STARTER_INTENTS.find((intent) => intent.id === value);
}

export function buildStarterIntentHref(intent: StarterIntent): string {
  const params = new URLSearchParams();
  params.set("intent", intent.id);

  if (intent.tool) params.set("tool", intent.tool);
  if (intent.prompt) params.set("prompt", intent.prompt);
  if (intent.focus) params.set("focus", intent.focus);
  if (intent.words) params.set("words", String(intent.words));

  const query = params.toString();
  return query ? `${intent.route}?${query}` : intent.route;
}

export function buildPrefilledHref(
  route: StarterDestination,
  params: {
    intent?: string;
    tool?: ToolKey;
    prompt?: string;
    focus?: string;
    words?: number;
  }
): string {
  const queryParams = new URLSearchParams();
  if (params.intent) queryParams.set("intent", params.intent);
  if (params.tool) queryParams.set("tool", params.tool);
  if (params.prompt) queryParams.set("prompt", params.prompt);
  if (params.focus) queryParams.set("focus", params.focus);
  if (params.words) queryParams.set("words", String(params.words));

  const query = queryParams.toString();
  return query ? `${route}?${query}` : route;
}
