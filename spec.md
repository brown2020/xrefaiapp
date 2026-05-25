# Xref.ai Product Spec and Roadmap

Current as of 2026-05-25.

## Purpose

This file is the product-facing companion to `AGENTS.md`.

- `AGENTS.md` explains how agents should work in the codebase: architecture, invariants, platform constraints, security boundaries, and verification expectations.
- `spec.md` explains what agents are building: the current product behavior, user-facing promises, product constraints, and roadmap milestones.
- Agents should use `AGENTS.md` to choose safe implementation patterns and `spec.md` to choose product direction.

Keep this document current when a feature changes product behavior, adds a new route, changes credit/payment logic, or materially changes the roadmap.

## Product Summary

Xref.ai is an AI creation workspace for writing, chat, summarization, image prompts, image generation, saved history, and flexible credit-based usage.

The product goal is to help users turn rough ideas, references, text, topics, URLs, and image concepts into useful outputs they can refine, save, repurpose, and return to later.

The product promise is not just "generate text." Xref.ai should feel like a practical creative workspace: it helps users start faster, make stronger creative choices, improve outputs through iteration, and turn one useful result into several finished deliverables.

## Current Product Spec

### Primary Users

- Individual creators who need fast drafts, summaries, captions, posts, and visual ideas.
- Students or researchers who need simplification, topic summaries, and reference-driven outputs.
- Marketers, consultants, and small teams who want repeatable content workflows without managing multiple AI tools.
- Advanced users who prefer to bring their own provider API keys instead of buying credits.

### Core User Journey

1. A visitor lands on `/` and sees the product promise, supported creation modes, and sign-in CTA.
2. The visitor signs in. Browser users can use Google, email/password, or email link; native WebView users follow the native-compatible auth path where popup-based Google sign-in is hidden.
3. The signed-in user opens Chat, Tools, History, or Account.
4. The user generates text, chat responses, or images using credits or their own API keys.
5. Successful outputs are saved or available in history.
6. The user buys more credits, reviews account settings, or switches to BYO provider keys from Account.

### Public Routes

| Route | Purpose | Notes |
| --- | --- | --- |
| `/` | Homepage and primary acquisition surface | Includes hero, typewriter, product sections, auth CTA, and feature overview. |
| `/about` | Company/product overview | Uses shared public-page layout. |
| `/terms` | Terms of Service | Ignite Channel Inc. legal identity. |
| `/privacy` | Privacy Policy | Ignite Channel Inc. legal identity. |
| `/support` | Support and contact information | Uses shared public-page layout. |
| `/loginfinish` | Email-link auth completion | Public auth utility route. |

### Protected Routes

Protected routes are gated by `src/proxy.ts` using auth-cookie presence. All real authorization must still happen in server actions and API routes.

| Route | Purpose |
| --- | --- |
| `/chat` | Streaming AI chat with saved conversation history. |
| `/tools` | Writing, summarization, simplification, freestyle, and image prompt tools. |
| `/history` | Saved generated outputs and chat/history records. |
| `/account` | Credits, payments, API keys, model selection, and profile management. |
| `/payment-attempt` | Stripe checkout handoff flow. |
| `/payment-success` | Post-checkout confirmation flow. |

### Current Capabilities

#### Authentication

- Firebase Auth supports Google sign-in, email/password, password reset, and email-link sign-in.
- `useAuthToken` writes a Firebase ID token to the auth cookie before profile sync.
- Server actions use `requireAuthedUid()`.
- API routes use `requireAuthedUidFromRequest()` and can also accept Bearer tokens for native WebView clients.
- Signing out from protected routes returns the user home.

#### AI Text

- Text generation is routed through the Vercel AI SDK.
- Supported provider keys are whitelisted in `src/ai/models.ts`:
  - `openai:gpt-5.4`
  - `anthropic:claude-sonnet-4-6`
  - `xai:grok-4`
  - `google:gemini-3-pro-preview`
- Credits mode uses server provider keys.
- BYO API key mode uses keys stored on the user profile.
- Text generation debits credits server-side before generation and refunds on stream failure or abort.

#### AI Chat

- `/api/chat` streams responses.
- Chat is authenticated, rate-limited, and idempotency-protected.
- Chat costs `CREDITS_COSTS.chatMessage` credits per message in credits mode.
- Client-side UI throttles streaming updates to keep rendering smooth.

#### Writing Tools

- `/tools` contains six current tools:
  - Summarize Website: scrape a URL through the hardened proxy and summarize the result with an optional focus.
  - Summarize Text: paste text and generate a concise summary.
  - Freestyle Writing: generate open-ended writing from a user prompt.
  - Simplify Writing: rewrite text to a selected grade level.
  - Generate Image: create an image from a text prompt with optional artist inspiration.
  - Designer Tool: compose structured visual prompts from design category, artist inspiration, flavors, candies, spices, colors, and a user topic.
- Requested word count is clamped by shared constants.
- Tool text generation uses `generateAIResponse()` and word-count based credit pricing.
- Website scraping routes through `/api/proxy`, which is authenticated, rate-limited, HTTPS-only, redirect-blocking, and SSRF-hardened.
- Tools are dynamically imported for code-splitting.

#### Image Generation

- Image generation uses Fireworks AI `stable-diffusion-xl-1024-v1-0`.
- Images cost `CREDITS_COSTS.imageGeneration` credits in credits mode.
- Successful images are uploaded to Firebase Storage and returned as signed URLs.
- Failed image generation refunds credits and clears the idempotency record.
- Image outputs support copy/download actions. The Designer Tool also exposes a placeholder share action.

#### Credits and Payments

- Credits are stored in Firestore at `users/{uid}/profile/userData.credits`.
- New server-created profiles default to 1,000 credits.
- Credit pack source of truth is `src/constants/creditPacks.ts`.
- Current packs:
  - Starter: $10.00 -> 1,100 credits
  - Plus: $25.00 -> 2,900 credits
  - Pro: $50.00 -> 6,000 credits
  - Power: $99.99 -> 13,000 credits
- Stripe checkout is created by `POST /api/billing/checkout`.
- Checkout confirmation is handled by `POST /api/billing/confirm`.
- Payment confirmation verifies auth, locks processing by session, validates Stripe metadata and amount, then writes payment, credits, and ledger records idempotently.
- IAP WebView confirmation is HMAC-signed, timestamp checked, and globally claim-guarded by `iapTransactions/{transactionId}`.
- Header credit display links to Account and shows a desktop "Top up" action when signed-in credits are below 200.

#### History

- User outputs are stored under the signed-in user's Firestore subcollections.
- Chat messages and tool summaries are clamped server-side for size.
- History includes search, pagination, expandable cards, markdown rendering, image display, copy/download actions, and local optimistic adds for newly saved repurposed outputs.
- Expanded text history items can already be repurposed into:
  - Twitter thread;
  - LinkedIn post;
  - client email;
  - 5 hooks;
  - SEO title + meta.
- Repurposed outputs can be saved back to History with `derivedFromId` metadata.

#### Account

- Account shows current credits, credit pack purchase options, payment history, credits ledger, auth data, API key controls, model selection, credits/API-key mode selection, and account deletion.
- Users can choose credits mode or BYO API keys mode.
- If required API keys are missing, the app forces credits mode to avoid sending incomplete BYO requests.
- API key fields preserve in-progress edits across profile refreshes.
- Header navigation includes a credits badge for signed-in users.
- The credits paywall modal explains required credits, current balance, credit packs, and the API-keys alternative.

#### Expo / React Native WebView Support

- A completed Expo app loads this web app inside a React Native WebView today.
- The web app contains deliberate native-environment branches. Do not remove them as "dead code" just because they differ from the browser experience.
- WebView detection is based on `window.ReactNativeWebView` via `src/utils/platform.ts` and `src/hooks/useClientSetup.ts`.
- Google sign-in is hidden in the WebView because popup-based Google auth is not part of the native flow.
- Stripe/web checkout controls are hidden in the WebView account screen; native credit purchase starts by posting `INIT_IAP` to `window.ReactNativeWebView`.
- Native purchase success returns an `IAP_SUCCESS` message that is verified by `confirmIapPurchase()` using HMAC signature, timestamp skew checks, credit caps, and a global transaction claim document.
- Cookie consent is suppressed in WebView.
- Some browser localStorage coordination is skipped in WebView to avoid native container issues.
- The client-side restricted-word guard currently applies only in the WebView context.

#### Public Legal and Support Pages

- `/about`, `/terms`, `/privacy`, and `/support` use the shared public-page layout components.
- Footer links are the canonical navigation to these pages.
- Do not duplicate a second public-page nav grid inside the content unless explicitly requested.
- Legal identity is Ignite Channel Inc.
- Company address: Ignite Channel Inc, 190 W Amado Road, Palm Springs, CA 92262.

#### Responsive Homepage

- The homepage hero typewriter is implemented with React state and CSS sizer spans.
- The typewriter area must stay stable on mobile and must not collapse to a cursor or push the layout while words change.
- Auth CTA button contrast must be checked in signed-in and signed-out states.

### Technical Invariants

- Every mutation must verify authentication server-side.
- Every chargeable generation must be idempotent.
- Every credit debit must be transactional and paired with a ledger entry.
- Every downstream generation failure after debit must attempt a deterministic refund.
- Payment fulfillment must never trust client-provided amount or credits.
- Profile writes must stay constrained to the server allowlist.
- The URL proxy must keep DNS/IP verification, private-IP blocking, redirect rejection, byte cap, and timeout protections.
- Firebase Admin must remain lazy-initialized so build-time prerender does not require credentials.

### Current Constraints

- No full test framework is configured. `npm run lint` and `npm run build` are the baseline checks.
- Browser verification is important for UI changes, especially homepage, auth modal, footer, and public pages.
- There is no first-class projects/workspaces feature yet.
- History has initial repurposing, but it is not yet a full workflow with editing, project organization, multi-step campaigns, or publish-ready export bundles.
- Generated text is displayed and saved, but there is no document editor/canvas for revising, combining, comparing, or versioning outputs.
- Prompt templates are mostly hard-coded into components. Users cannot save reusable prompts or define variables.
- The image workflow is single-shot: no variations, seed control, aspect ratio options, prompt enhancer, style library, or gallery collections.
- Chat has useful examples and saved history, but it is not yet deeply connected to tools, projects, files, or prior saved outputs.
- Performance is not measured through product metrics yet: generation latency, perceived wait time, first useful output, checkout conversion, and repeated creation loops are not tracked.
- Google Analytics through Firebase is available from the existing Firebase environment config, but the product event taxonomy and shared analytics helper are not yet implemented.
- Admin/support tooling for refunds, user lookup, and credit adjustments is not yet first-class.

## Roadmap

### Roadmap Principles

- Preserve trust first: credits, payments, auth, and user data must be correct before growth work.
- Make outputs reusable: one generation should become a starting point for drafts, variants, campaigns, images, and follow-up work.
- Improve creative control: users should be able to steer voice, audience, format, style, length, and output structure without becoming prompt engineers.
- Improve perceived performance: every generation should feel responsive, explain what is happening, and keep useful work visible if saving fails.
- Improve conversion in context: credit prompts should explain cost, balance, and value at the moment of need.
- Keep mobile polished: homepage, auth, tools, chat, history, and account should be usable on small screens.

The milestones are ordered intentionally. Start by improving activation and output quality, then make saved work reusable, then add organization and deeper creation surfaces, then improve performance, monetization, and operations. Reliability work remains important, but it should support the creative workflow rather than dominate the roadmap.

### Product Decisions

These decisions resolve the roadmap questions that should not remain open for implementation agents.

- Pricing model: keep user-facing credits as Xref.ai's own simple, action-based pricing system. Chat messages, text generations, image generations, campaign packs, and advanced templates should have understandable published credit costs. Internally, credits must map to estimated provider token/image costs with enough margin to stay profitable. Track provider, model, estimated tokens, latency, success/failure, refund status, and internal cost metadata server-side so pricing can be tuned from real usage. Do not expose token-based text pricing to users unless simple credit pricing becomes materially misleading or unprofitable.
- Image pricing: expose image quality/speed/variation controls only when the provider path can support them predictably. Use simple preset pricing when introduced: standard single image, premium/high-quality image, and multi-variation pack. Show the credit cost before generation and keep refund behavior deterministic.
- First-run focus: prioritize marketers and creators first, with secondary paths for students and researchers. The first-run experience should emphasize drafting posts, repurposing content, summarizing URLs, creating emails, and generating image concepts because those flows best match the app's creative-workspace promise and monetization model.
- Projects: launch projects as single-user organization first. Design the data model with ownership and future collaborator fields, but do not build real-time collaboration, team billing, invitations, or permissions in the first projects milestone.
- Analytics owner: use Google Analytics through Firebase as the primary owner for product events because the Firebase measurement ID is already part of the environment config. Add a small internal analytics helper so product events are consistently named and can be mirrored or migrated later. Vercel Web Analytics can remain useful for lightweight traffic/page analytics if enabled, but Firebase/GA4 should own activation, generation, credit, checkout, and retention events. If feature flags become necessary, prefer Firebase Remote Config before adding another analytics vendor.

### Analytics Implementation Note

Use `firebase/analytics` through a browser-only helper, initialized from the existing Firebase app and `NEXT_PUBLIC_FIREBASE_MEASUREMENTID`. The helper should call `isSupported()` before `getAnalytics()` and should no-op on the server. Do not log raw prompts, generated content, API keys, auth tokens, or payment secrets. Log event names and bounded metadata such as tool name, model key, credit cost, success/failure, latency bucket, and entry point.

### Roadmap Execution Rules

- Each milestone below is intended to be executable as one focused PR. If a PR grows beyond the listed scope, split it at an acceptance-criteria boundary instead of bundling unrelated work.
- Keep milestones shippable in order. Later milestones can read data introduced earlier, but earlier milestones should not depend on unbuilt future features.
- Every milestone should preserve browser and Expo WebView behavior, especially auth, checkout/IAP, cookie consent, and localStorage branches.
- Product-event work should use the Firebase/GA4 analytics helper once it exists.
- Visible UI milestones require desktop and mobile browser verification in addition to `npm run lint`; routing, server action, API, payment, credit, or shared data changes should also run `npm run build`.

## Milestone 1: Activation Starter Paths

Goal: help a new user reach a useful first output from the homepage or first protected route.

Depends on: current homepage, auth modal, Chat, and Tools.

PR scope:

- Add creator- and marketer-first starter intents, with secondary entries for students and researchers.
- Support starter intent links from the homepage into existing Chat or Tools screens using route/query state.
- Prefill the selected tool or chat input when a starter intent is chosen.
- Improve empty states on Chat and Tools with expected input, example input, estimated credit cost, and likely output.
- Add post-generation next-action buttons where the action already exists, such as copy, save, repurpose, continue in chat, or create an image prompt.

Out of scope:

- New project storage, saved templates, analytics, or pricing changes.

Acceptance criteria:

- A new signed-in user can create a first useful output within one minute.
- A user can start from a use case instead of a blank prompt box.
- Starter links work on desktop and mobile without breaking the existing hero, auth modal, or WebView auth path.

## Milestone 2: Writing Controls and Generation Metadata

Goal: make generated writing feel more tailored, polished, and ready to use.

Depends on: Milestone 1.

PR scope:

- Add reusable controls across writing tools:
  - tone;
  - audience;
  - format;
  - reading level;
  - length;
  - call to action;
  - output structure.
- Add first-class prompt builders for the highest-value deliverables: social post, professional email, blog outline, product description, and study guide.
- Save tool type, starter intent, and generation settings in history metadata.
- Keep credit costs action-based and visible before generation where the UI already shows costs.

Out of scope:

- Revision actions, projects, saved templates, and batch history actions.

Acceptance criteria:

- Users can guide outputs without writing long prompts manually.
- The top deliverable formats are available as first-class tool flows.
- New metadata is backward-compatible with existing history items.

## Milestone 3: Text Revision Actions

Goal: let users improve a generated text output without starting over.

Depends on: Milestone 2 metadata.

PR scope:

- Add revision actions after text generation and on expanded text history items:
  - make clearer;
  - make shorter;
  - make more persuasive;
  - change tone;
  - add examples;
  - create alternatives.
- Generate revisions through existing authenticated, idempotent, credit-aware text generation paths.
- Save revisions back to History with `derivedFromId`, source tool, revision action, and generation settings.
- Add a simple compare view for original vs revised output where space allows.

Out of scope:

- Multi-select history actions, projects, and saved prompt templates.

Acceptance criteria:

- A user can revise a text output and save the revision to History.
- Revisions preserve source relationships and do not overwrite the original item.
- Credit debit, failure, and refund behavior matches existing generation paths.

## Milestone 4: History Organization and Continuation

Goal: turn History from a record of outputs into the place where work continues.

Depends on: Milestone 3 derived output metadata.

PR scope:

- Expand existing repurpose actions beyond five fixed targets with a focused v1 set:
  - social post pack;
  - email sequence;
  - blog outline;
  - image prompt;
  - chat follow-up.
- Add filters and labels by output type, tool, date, and derived status.
- Show source/derived relationships more clearly as a lightweight chain.
- Allow users to rename saved outputs and add notes.
- Add "continue in chat" from any text history item with the original prompt and output as context.

Out of scope:

- Batch actions, project filters, exports, and team sharing.

Acceptance criteria:

- A saved output can lead naturally to multiple deliverables.
- Users can find and continue prior work without re-prompting from scratch.
- Derived outputs keep enough context to understand where they came from.

## Milestone 5: Single-User Projects and Brand Voice

Goal: make the app useful for repeated work across clients, classes, campaigns, or topics.

Depends on: Milestone 4 History metadata.

PR scope:

- Add `projects` under `users/{uid}/projects/{projectId}`.
- Keep the first projects release single-user, while reserving fields for future ownership and collaborator metadata.
- Allow history items to optionally link to a project.
- Add lightweight project context fields:
  - goal;
  - audience;
  - tone/brand voice;
  - source notes;
  - default model/settings.
- Add project selection to generation flows where it can prefill tone, audience, and source notes.
- Add project filtering in History.

Out of scope:

- Saved prompt templates, collaboration, project permissions, team billing, and real-time shared editing.

Acceptance criteria:

- Users can group outputs by project.
- Project context can be reused in chat and tools.
- Existing users without projects can keep using Chat, Tools, History, and Account unchanged.

## Milestone 6: Saved Prompts and Template Gallery

Goal: let users rerun repeatable creative workflows without rebuilding prompts.

Depends on: Milestone 5 project context.

PR scope:

- Add saved prompt templates with variables such as `{topic}`, `{audience}`, `{tone}`, and `{format}`.
- Add a small template gallery organized by job-to-be-done rather than model capability.
- Allow template runs from Chat or Tools and save outputs to History.
- Allow templates to optionally use project context.
- Track template source in history metadata.

Out of scope:

- Marketplace/premium template packs, collaboration, and team templates.

Acceptance criteria:

- Users can save and rerun prompts without rebuilding them manually.
- Template outputs carry enough metadata to be found, revised, and linked to projects later.
- Template runs follow existing credit, auth, idempotency, and refund behavior.

## Milestone 7: Image Studio v1

Goal: make image generation more controllable, repeatable, and connected to writing outputs.

Depends on: Milestone 4 History continuation.

PR scope:

- Add image generation controls progressively, showing the exact credit cost before generation:
  - aspect ratio;
  - style preset;
  - multi-variation packs if supported predictably;
  - standard vs premium quality/speed only when provider behavior and costs are stable.
- Add a prompt enhancer that turns short ideas into stronger image prompts before spending image credits.
- Let users generate image prompts from text history items, blog ideas, products, or campaign briefs.
- Add an image gallery filter/view in History.
- Replace the placeholder share action with real share/export options where feasible.
- Improve image safety UX with clearer blocked-content messaging and suggested prompt edits.

Out of scope:

- Provider migrations, advanced editing/inpainting, collaboration, public gallery sharing, and template-to-image shortcuts.

Acceptance criteria:

- Users can make intentional visual choices before generating.
- Writing outputs can feed image creation without copy/paste.
- Image history feels like a reusable gallery, not just a list of URLs.

## Milestone 8: Chat Workspace Connections

Goal: connect Chat to the rest of the workspace so it can plan, critique, and continue work.

Depends on: Milestone 5 projects and Milestone 6 templates.

PR scope:

- Add chat modes or prompt starters:
  - brainstorm;
  - critique;
  - rewrite;
  - plan;
  - research summary;
  - campaign builder.
- Allow Chat to reference selected history items or project context.
- Add "send to tool" actions from chat responses.
- Add "save as summary", "save as template", and "save to project" actions from chat.
- Improve conversation memory controls so users can see what context is being sent.

Out of scope:

- Autonomous multi-step agents, file uploads, collaboration, and long-term memory beyond explicit selected context.

Acceptance criteria:

- Chat can continue from prior saved work.
- Users can move from conversation to tool output and back.
- Chat becomes a creative planning surface, not only a question-answer page.

## Milestone 9: Performance and Draft Resilience

Goal: make the app feel faster and reduce friction during creative work.

Depends on: the main creation surfaces introduced in Milestones 1-8.

PR scope:

- Improve perceived generation latency:
  - clearer progress states;
  - phase labels such as scraping, thinking, writing, saving;
  - useful partial output during streaming.
- Add draft persistence for long inputs so navigation or refresh does not lose work.
- Improve expensive surfaces:
  - keep tool code-splitting;
  - review image and markdown rendering paths;
  - keep large chat/history lists bounded;
  - avoid unnecessary Firestore listener churn.
- Add autosave or manual save for in-progress prompt templates and project notes.
- Improve mobile ergonomics for Tools and History, especially the tool selector and expanded history cards.

Out of scope:

- New product features unrelated to speed, drafts, or mobile ergonomics.

Acceptance criteria:

- Users understand what is happening while the app works.
- Long inputs survive common interruptions.
- Chat, Tools, and History remain smooth with realistic saved data volumes.

## Milestone 10: Credits, Cost Telemetry, and Firebase Analytics

Goal: make credits understandable, trustworthy, and easy to top up.

Depends on: Firebase client env, current credit system, and payment routes.

PR scope:

- Keep user-facing credits action-based and easy to understand while mapping credits to internal token/image cost estimates with profitable margins.
- Add internal cost telemetry fields where provider/model/token/image cost estimates are available, without exposing token pricing to users.
- Add a browser-only Firebase/GA4 analytics helper using the existing measurement ID env variable.
- Add low-credit surfacing in shared navigation or protected layouts.
- Improve the insufficient-credits modal with:
  - required credits;
  - current balance;
  - recommended pack;
  - "Buy credits" primary action;
  - "Use my API keys" secondary action when applicable.
- Add basic event tracking for:
  - sign-in started and completed;
  - generation started, succeeded, failed, refunded;
  - paywall shown;
  - checkout started and confirmed;
  - credits depleted.
- Route product events through a small analytics helper backed by Firebase/Google Analytics as the primary owner of activation, generation, credit, checkout, and retention events.
- Add account ledger UX improvements for credits spent and credits purchased.
- Add clear value framing around higher-cost actions such as image generation, campaign packs, and advanced templates.

Out of scope:

- Token-based user pricing, subscription plans, coupons, enterprise billing, or a new analytics vendor.

Acceptance criteria:

- A user blocked by low credits understands why and can top up quickly.
- The team can measure activation, credit depletion, checkout conversion, and repeat purchase.
- Credit history is understandable to a user.
- Analytics initialization no-ops safely when unsupported or running outside the browser.

## Milestone 11: Payment Reliability and Support Diagnostics

Goal: make money-path failures easier to prevent, detect, and explain.

Depends on: Milestone 10 credit telemetry.

PR scope:

- Add targeted tests around credit math, idempotency, and payment confirmation.
- Add Stripe webhook handling or scheduled reconciliation if checkout confirmation remains user-return driven.
- Add structured server logs for generation, credit, payment, and proxy failures.
- Add a small browser smoke checklist or automated smoke tests for the few UI areas that repeatedly gate conversion: homepage, auth modal, hero typewriter, footer, public pages, and paywall.
- Add a support runbook documenting how to inspect payment, ledger, idempotency, and refund records manually until admin tooling exists.

Out of scope:

- Admin/support UI, manual credit adjustment workflows, and broad CRM features.

Acceptance criteria:

- Payment and credit issues can be diagnosed through tests, logs, and a documented runbook.
- Critical money paths have automated coverage.
- Failed downstream operations leave an auditable trail.

## Milestone 12: Admin Support Tools v1

Goal: make routine support actions safe enough to perform without direct Firestore edits.

Depends on: Milestone 11 diagnostics and runbook.

PR scope:

- Add protected admin/support workflows for:
  - looking up a user by email;
  - viewing payment and ledger history;
  - granting credits with an audit reason;
  - reversing credits with an audit reason;
  - investigating failed refunds.
- Use server-side authorization checks distinct from normal signed-in user checks.
- Write audit records for every support mutation.

Out of scope:

- Team roles UI, broad CRM features, automated refunds, and collaboration administration.

Acceptance criteria:

- Support can resolve common credit/payment issues without direct database edits.
- Every manual credit adjustment has an actor, reason, timestamp, and balance-after value.
- Admin routes are inaccessible to normal users.
