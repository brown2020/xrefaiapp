"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AuthComponent from "@/components/AuthComponent";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  PenTool,
  Share2,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

const typewriterWords = [
  "Topic Summaries",
  "Blog Posts",
  "Newsletters",
  "Travel Logs",
  "Website Content",
  "Essay Paragraphs",
  "Homework Help",
  "Descriptions",
  "Product Info",
  "Social Media Posts",
  "Instagram Captions",
  "Marketing Content",
];

const features = [
  {
    icon: FileText,
    title: "Writing Tools",
    description:
      "Draft posts, essays, descriptions, and marketing copy with a workflow built for revision.",
    color: "text-blue-600",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    description:
      "Explore ideas in conversation, keep useful context, and return to saved threads.",
    color: "text-[#f97316]",
  },
  {
    icon: ImageIcon,
    title: "Image Generation",
    description:
      "Convert structured prompts into images for campaigns, concepts, and creative exploration.",
    color: "text-pink-600",
  },
  {
    icon: Zap,
    title: "Fast Summaries",
    description:
      "Compress topics, notes, articles, and references into clearer starting points.",
    color: "text-amber-600",
  },
  {
    icon: PenTool,
    title: "Rewrite and Simplify",
    description:
      "Polish existing text, sharpen tone, or make dense material easier to read.",
    color: "text-green-700",
  },
  {
    icon: Share2,
    title: "Saved History",
    description:
      "Keep generated work available so good ideas do not disappear after one session.",
    color: "text-cyan-700",
  },
] as const;

const workflow = [
  "Choose a tool or open chat.",
  "Add a prompt, topic, text, URL, or image idea.",
  "Generate, refine, save, and keep creating.",
] as const;

const TYPEWRITER_TYPE_DELAY_MS = 72;
const TYPEWRITER_DELETE_DELAY_MS = 38;
const TYPEWRITER_HOLD_DELAY_MS = 1250;
const TYPEWRITER_NEXT_WORD_DELAY_MS = 180;

export default function Home() {
  return (
    <div className="min-h-full bg-[#fbfaf7] text-foreground">
      <section className="relative overflow-hidden border-b border-border bg-[#111827] text-white">
        <Image
          src="/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none object-cover opacity-30"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-[#111827]/70" />

        <div className="container relative z-10 mx-auto px-4 py-14 sm:py-16 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white backdrop-blur">
              <Sparkles className="mr-2 h-4 w-4 text-[#fbbf24]" />
              AI writing, chat, and image tools
            </div>

            <h1 className="text-5xl font-extrabold leading-tight tracking-normal md:text-7xl">
              Create amazing
            </h1>

            <div className="mx-auto mt-4 flex h-[5.25rem] w-full max-w-[20ch] items-start justify-center overflow-hidden text-3xl font-extrabold leading-tight tracking-normal text-white sm:h-[3.5rem] sm:text-4xl md:h-[4.5rem] md:text-5xl lg:text-6xl">
              <span className="text-[#fbbf24]">
                <HeroTypewriter words={typewriterWords} />
              </span>
            </div>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/80 md:text-xl">
              Turn references, prompts, and rough ideas into drafts, summaries,
              chat answers, and visuals without losing track of what you made.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <AuthComponent />
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15"
              >
                Explore features
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-border bg-card py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-accent">
              Toolkit
            </p>
            <h2 className="text-3xl font-extrabold tracking-normal text-foreground md:text-4xl">
              One workspace for writing, chat, images, and saved outputs.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The app is organized around real creation tasks, with flexible
              credits and account controls behind the scenes.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-[#fbfaf7] py-16 md:py-20">
        <div className="container mx-auto grid gap-10 px-4 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-accent">
              Flow
            </p>
            <h2 className="text-3xl font-extrabold tracking-normal text-foreground md:text-4xl">
              From a rough reference to something useful.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Xref.ai keeps the path short: prompt, generate, review, and save
              the result in the same account.
            </p>
          </div>

          <div className="grid gap-4">
            {workflow.map((item, index) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-lg border border-border bg-card p-5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="pt-1 font-semibold leading-6 text-foreground">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#111827] py-16 text-white md:py-20">
        <div className="container mx-auto grid gap-10 px-4 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <div className="mb-5 inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-white">
              <CreditCard className="mr-2 h-4 w-4 text-[#fbbf24]" />
              Flexible credits
            </div>
            <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-normal md:text-4xl">
              Use credits when you need them. Bring your own provider keys when
              you want more control.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
              Credits power generation without a subscription lock-in, while
              account settings let advanced users route supported models through
              their own API keys.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={ROUTES.account}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-foreground transition-opacity hover:opacity-90"
              >
                Buy credits
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={ROUTES.terms}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Read terms
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            {[
              "Transparent generation costs",
              "Stripe checkout",
              "Server-side credit ledger",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 p-4"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#02c173]" />
                <span className="text-sm font-semibold text-white/90">
                  {item}
                </span>
              </div>
            ))}
            <div className="hidden items-center gap-3 rounded-lg border border-white/15 bg-white/10 p-4 md:flex">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#fbbf24]" />
              <span className="text-sm font-semibold text-white/90">
                Auth, rate-limit, and duplicate-charge protections
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroTypewriter({ words }: { words: readonly string[] }) {
  const visibleWords = useMemo(
    () => words.filter((word) => word.trim().length > 0),
    [words]
  );
  const [wordIndex, setWordIndex] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentWord = visibleWords[wordIndex % visibleWords.length] ?? "";
  const visibleText = currentWord.slice(0, characterCount);

  useEffect(() => {
    if (!currentWord) {
      return undefined;
    }

    const delay = isDeleting
      ? characterCount > 0
        ? TYPEWRITER_DELETE_DELAY_MS
        : TYPEWRITER_NEXT_WORD_DELAY_MS
      : characterCount < currentWord.length
        ? TYPEWRITER_TYPE_DELAY_MS
        : TYPEWRITER_HOLD_DELAY_MS;

    const timer = window.setTimeout(() => {
      if (isDeleting) {
        if (characterCount > 0) {
          setCharacterCount((count) => Math.max(count - 1, 0));
          return;
        }

        setWordIndex((index) => (index + 1) % visibleWords.length);
        setIsDeleting(false);
        return;
      }

      if (characterCount < currentWord.length) {
        setCharacterCount((count) =>
          Math.min(count + 1, currentWord.length)
        );
        return;
      }

      setIsDeleting(true);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [characterCount, currentWord, isDeleting, visibleWords.length]);

  return (
    <span className="home-typewriter" aria-label={currentWord}>
      {visibleWords.map((word) => (
        <span key={word} aria-hidden="true" className="home-typewriter__sizer">
          {word}
        </span>
      ))}
      <span aria-hidden="true" className="home-typewriter__word">
        {visibleText || "\u00a0"}
      </span>
    </span>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent">
      <Icon className={`mb-4 h-6 w-6 ${color}`} />
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
