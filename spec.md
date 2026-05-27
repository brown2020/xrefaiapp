# Xref.ai Product Spec And Roadmap

Current as of 2026-05-27.

## Purpose

`spec.md` is the authoritative product spec and roadmap for Xref.ai. It describes what the app currently is, what product promises matter, and which PR-sized milestones should guide future work.

Use `AGENTS.md` for implementation rules, architecture invariants, validation, and autonomous workflow. Update this file when product behavior, user-facing scope, routes, credits/payments, integrations, or roadmap priorities change.

## Product Overview

### Product Promise

Xref.ai helps users turn rough ideas, references, URLs, notes, text, and image concepts into useful creative outputs they can refine, save, repurpose, and return to later.

The product should feel like a practical creative workspace, not a disconnected set of prompt boxes. A good Xref.ai session starts quickly, produces a usable first result, and gives the user clear next steps for continuing the work.

### Target Users

- Creators who need captions, posts, hooks, visual concepts, drafts, and reusable content ideas.
- Marketers and consultants who need product emails, campaign copy, summaries, repurposing, and image concepts.
- Students who need study guides, simplification, summaries, and practice questions.
- Researchers or knowledge workers who need URL/text summaries and reference-driven outputs.
- Advanced users who prefer to bring their own provider API keys instead of buying credits.

Inferred from current product: the homepage starter paths and copy prioritize creators and marketers first, with students and researchers as secondary use cases.

### Core Workflows

1. Visitor lands on `/`, reviews the product promise, and chooses either auth or a starter path.
2. User signs in through Firebase Auth.
3. User opens Chat, Tools, History, or Account.
4. User generates a chat response, text output, website summary, simplified rewrite, image prompt, or image.
5. Credits are debited server-side in credits mode, or the user's provider keys are used in API-key mode.
6. Successful outputs can be saved into History.
7. User can search History, expand saved items, copy/download, or repurpose text into a few common formats.
8. User buys more credits through Stripe on web or through signed IAP messages in the Expo WebView path.

### Product Goals

- Help a new user get a useful first output quickly.
- Make credit costs and account state understandable.
- Keep generated work reusable instead of disposable.
- Build creative control gradually without forcing users to learn prompt engineering.
- Preserve trust in auth, payments, credits, refunds, and saved user data.
- Keep browser and Expo WebView paths working together.

## Current Application State

### What The App Currently Does

Xref.ai is a signed-in AI workspace with:

- public marketing/legal/support pages;
- Firebase authentication;
- protected Chat, Tools, History, Account, and payment handoff pages;
- streaming AI chat;
- six creation tools;
- saved history;
- text repurposing actions;
- credit purchases;
- credits ledger;
- user API-key mode;
- image generation and Firebase Storage upload;
- React Native WebView-specific purchase/auth behavior.

### Current Routes

Public routes:

| Route | Purpose |
| --- | --- |
| `/` | Homepage, starter paths, feature overview, auth CTA |
| `/about` | Product/company overview |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `/support` | Support contact and common requests |
| `/loginfinish` | Email-link auth completion |

Protected routes:

| Route | Purpose |
| --- | --- |
| `/chat` | Streaming AI chat with saved conversation history |
| `/tools` | Summarization, writing, simplification, image, and designer tools |
| `/history` | Saved outputs, search, pagination, expansion, copy/download, repurpose |
| `/account` | Credits, payments, ledger, API keys, model selection, account deletion |
| `/payment-attempt` | Starts Stripe Checkout for a selected credit pack |
| `/payment-success` | Confirms Stripe Checkout and credits the account |

API routes:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/chat` | `POST` | Streaming chat generation |
| `/api/billing/checkout` | `POST` | Create Stripe Checkout Session |
| `/api/billing/confirm` | `POST` | Confirm Stripe Session and credit user |
| `/api/proxy` | `GET` | Authenticated SSRF-hardened URL fetch for website summaries |

### Feature Inventory

#### Homepage And Activation

- Hero with typewriter text and stable CSS sizing.
- Starter paths for Creator, Marketer, Student, and Researcher use cases.
- Starter links route into Chat or Tools with query-state prompt/tool prefills.
- Feature overview, workflow section, and credits/API-key value framing.
- Auth CTA from homepage through `AuthComponent`.

#### Authentication

- Firebase Auth with Google popup sign-in, email/password, password reset, and email-link sign-in.
- Google sign-in hidden in React Native WebView.
- ID token written to `xrefAuthToken` cookie before protected navigation.
- Auth token refresh on interval, focus, and visibility change.
- Protected routes use `src/proxy.ts` for cookie-presence soft gating.
- Server actions and API mutations verify ID tokens server-side.

#### Chat

- Active chat path is `src/components/Chat.tsx` plus `/api/chat`.
- Uses Vercel AI SDK React transport and `streamText`.
- Sends recent saved chat history trimmed to `MAX_WORDS_IN_CONTEXT`.
- Costs `CREDITS_COSTS.chatMessage` credits in credits mode.
- Rate-limited, idempotency-protected, and refund-aware.
- Saves successful exchanges under `users/{uid}/chats`.
- Shows starter guidance and empty-state examples.

#### Tools

The `/tools` page dynamically loads six tools:

- Summarize Website: fetches a public HTTPS URL through `/api/proxy`, extracts browser-side text, and summarizes it.
- Summarize Text: summarizes pasted text with format, audience, emphasis, and focus controls.
- Freestyle Writing: drafts open-ended writing from a prompt with deliverable, tone, audience, length, and call-to-action controls.
- Simplify Writing: rewrites text at a selected reading level.
- Generate Image: sends a direct image prompt with optional artist inspiration.
- Designer Tool: builds an image prompt from structured style/object/flavor/color choices and a topic.

Tool text generation uses `generateAIResponse()` and word-count based pricing. Tool guide panels show expected input, examples, estimated cost, and likely output.

Successful text tool outputs show next-step actions to continue in Chat, create an image prompt from the output, or open History. Freestyle Writing and Summarize Text save optional tool, starter intent, and generation-settings metadata with history entries.

#### Image Generation

- Uses Fireworks AI `stable-diffusion-xl-1024-v1-0`.
- Generates 1024x1024 JPEGs.
- Uploads successful images to Firebase Storage and returns signed URLs.
- Image generation costs `CREDITS_COSTS.imageGeneration` credits in credits mode.
- Image results can be copied or downloaded.
- Image outputs are saved to History with `words: "image"`.
- Image generation is authenticated, rate-limited, and uses fresh client idempotency keys to protect retries without blocking intentional repeat prompts.

#### History

- History reads `users/{uid}/summaries` with Firestore pagination.
- Supports search, expandable cards, markdown rendering, image rendering, text copy, image URL copy, and image download.
- Text history items can be repurposed into:
  - Twitter thread;
  - LinkedIn post;
  - client email;
  - 5 hooks;
  - SEO title and meta.
- Repurposed outputs can be saved back to History with `derivedFromId` and `tool` metadata.
- Expanded History cards do not yet expose the same "continue in chat" or "create image prompt" next actions that fresh tool outputs show.

#### Account, Credits, And Payments

- New server-created profiles default to 1,000 credits.
- Current credit costs:
  - chat message: 25 credits;
  - image generation: 300 credits;
  - text tools: max of 25 credits or half the requested word count rounded up.
- Current credit packs:
  - Starter: $10.00 for 1,100 credits;
  - Plus: $25.00 for 2,900 credits;
  - Pro: $50.00 for 6,000 credits;
  - Power: $99.99 for 13,000 credits.
- Stripe Checkout is started from `/payment-attempt` and fulfilled on `/payment-success`.
- Stripe confirmation verifies metadata UID, payment status, pack ID, and amount before crediting.
- A Firestore payment lock prevents double-processing the same session.
- Account shows payment history and a live credits ledger.
- The paywall modal can show required credits, current context, credit packs, and an API-key alternative.
- Account includes a Delete Account control. Current server behavior deletes the profile document and Firebase Auth user, but does not cascade saved subcollections or generated image storage.

#### API-Key Mode

- Users can store Fireworks, OpenAI, Anthropic, xAI, Google, and Stability key fields.
- Current text model whitelist:
  - `openai:gpt-5.4`
  - `anthropic:claude-sonnet-4-6`
  - `xai:grok-4`
  - `google:gemini-3-pro-preview`
- Credits mode uses server provider keys.
- API-key mode uses profile provider keys.
- Current UI requires a Fireworks key plus the selected text provider key before enabling API-key mode.
- Stability key is stored but not used by the active image generation path.

#### Expo WebView Support

- The web app contains React Native WebView branches using `window.ReactNativeWebView`.
- WebView suppresses cookie consent.
- WebView hides Google popup sign-in.
- WebView hides web Stripe checkout controls and starts native purchase with `INIT_IAP`.
- Native purchase success sends `IAP_SUCCESS`; the server action verifies HMAC signature, timestamp skew, credit cap, and global transaction claim docs.
- The restricted-word guard is client-only and WebView-only.

#### Public Legal And Support Pages

- `/about`, `/terms`, `/privacy`, and `/support` use shared public-page components.
- Footer links are the canonical public-page navigation.
- Legal/support identity is Ignite Channel Inc.
- Current address: Ignite Channel Inc, 190 W Amado Road, Palm Springs, CA 92262.

### Existing Integrations

- Firebase Auth for sign-in and ID token verification.
- Firestore for profile, chats, summaries, payments, ledger, idempotency, rate limit counters, and payment locks.
- Firebase Storage for generated image files.
- Stripe Checkout for web credit purchases.
- Fireworks AI for image generation.
- Vercel AI SDK with OpenAI, Anthropic, xAI, and Google for text/chat.
- React Native WebView message bridge for native IAP.
- Firebase measurement ID exists in config, but no product analytics helper is implemented yet.

### Architecture Summary

- Next.js App Router pages render the public/protected product surfaces.
- `src/proxy.ts` performs soft cookie-presence route gating.
- `ClientProvider` handles auth token refresh, store initialization, paywall modal, cookie consent, toasts, and logout redirects.
- Server actions handle profile, history, credits, text generation, image generation, and IAP confirmation.
- API routes handle chat streaming, Stripe checkout/confirmation, and the hardened URL proxy.
- Zustand stores hold auth, profile/credits, payments, and paywall state.
- Firestore transactions protect credit, payment, idempotency, and rate-limit read/modify/write paths.

### Existing Technical Constraints

- `main` is the production branch and `dev` is the autonomous working branch.
- npm is the package manager.
- No unit test runner is configured.
- Playwright has a small activation starter-path smoke suite.
- `npm run build` may require valid enough environment configuration for build-time code paths.
- Firebase Admin is lazy-initialized so build/prerender can complete without immediately touching credentials.
- `reactStrictMode` is disabled; re-enabling requires auth/profile effect audit.
- No formatter script is configured.
- No repository-owned deployment files such as `vercel.json`, `firebase.json`, Dockerfile, workflow YAML, cron config, or queue worker config are present. Hosting details are inferred to live outside the repo.
- Public native association files exist under `public/.well-known/`.
- `.env.example` includes `FIREBASE_UNIVERSE_DOMAIN`, but the active Firebase Admin initialization does not read it.
- Website scraping depends on public HTTPS pages and simple DOM text extraction, not a full readability pipeline.
- Payment fulfillment is currently return-page driven, not webhook/reconciliation driven.
- Cleanup utilities for idempotency and rate-limit docs exist but are not scheduled.

### Known Limitations

- Projects/workspaces do not exist yet.
- Saved prompt templates and reusable variables do not exist yet.
- History is useful but not yet a full continuation workspace with labels, filters, rename, notes, or source chains beyond basic derived metadata.
- Fresh tool outputs can continue into Chat, but expanded History items cannot yet do that directly.
- Text revision actions are not first-class outside the current repurpose buttons.
- Image generation is single-shot: no aspect ratio, seed, variation, quality, style preset, prompt enhancer, or gallery view.
- Chat cannot explicitly reference selected history items or project context.
- API-key mode currently requires Fireworks even for text-first users.
- Account deletion currently leaves user subcollections and generated image storage behind unless removed separately.
- `src/hooks/useChatGeneration.ts` is legacy/unused by the current Chat component.
- `usePaymentsStore.addPayment()` and `serverPayments.addPaymentServer()` are not connected to the active purchase UI.
- `src/constants/index.ts` includes some historical exported constants that are not read by active server paths.
- Product analytics/event taxonomy is not implemented.
- Admin/support tools for user lookup, manual credits, refunds, and diagnostics do not exist.

## Product Roadmap

### Roadmap Principles

- Preserve trust first: credits, payments, auth, and user data must stay correct.
- Improve activation and output quality before broadening the product.
- Make saved outputs reusable.
- Add creative control in visible, user-friendly controls rather than generic prompt complexity.
- Keep milestones small enough for one clean commit sequence.
- Prefer product capability, usability, reliability, performance, onboarding, activation, and core workflow improvements over generic cleanup.
- Preserve browser and Expo WebView behavior in every milestone.

Recently completed:

- Activation Starter Paths. The homepage routes common creator, marketer, student, and researcher starter intents into Chat or Tools with prefills and guidance.
- Freestyle Writing Deliverable Builder. Freestyle Writing now has reusable deliverable, tone, audience, length, and call-to-action controls, and saves backward-compatible generation metadata with history entries.
- Summarize Text Summary Controls. Summarize Text now has summary format, audience, emphasis, and focus controls, and saves backward-compatible generation metadata with history entries.

### Completed Milestone: Freestyle Writing Deliverable Builder

User value: users can steer output quality without writing long prompts manually.

Implementation note: completed on 2026-05-27 as the first PR-sized slice of Writing Controls And Deliverable Builders. The initial implementation focuses on Freestyle Writing because it is the open-ended text tool where social posts, professional emails, blog outlines, product descriptions, and study guides naturally fit without changing summarization or simplification behavior.

What shipped:

- Added reusable writing-control option models for deliverable, tone, audience, length, and call to action.
- Added first-class Freestyle Writing flows for social post, professional email, blog outline, product description, study guide, and freeform draft.
- Updated prompt construction so controls shape the generated output.
- Saved optional `tool`, `starterIntentId`, and `settings` metadata on generated history records while preserving existing history fields.
- Kept existing credit pricing tied to requested word count.

Acceptance criteria:

- A user can choose a deliverable format and guide voice, audience, and length before generation in Freestyle Writing.
- Generated Freestyle history records include backward-compatible metadata.
- Existing tools continue to work without selecting advanced options.

### Completed Milestone: Summarize Text Summary Controls

User value: pasted text summaries can be shaped for the reader and job-to-be-done without rewriting the prompt manually.

Implementation note: completed on 2026-05-27 as the next PR-sized slice of Writing Controls Across Remaining Text Tools. The implementation focuses on Summarize Text because it can add summary-specific controls without touching website scraping or simplification behavior.

What shipped:

- Added reusable summary-control option models for summary format, audience, emphasis, and focus.
- Added Summarize Text controls for concise summary, key takeaways, executive brief, and study notes formats.
- Updated prompt construction so summary format, audience, emphasis, and focus guide the generated output.
- Saved optional `tool` and `settings` metadata on generated Summarize Text history records while preserving existing history fields.
- Kept credit pricing tied to requested word count.

Acceptance criteria:

- A user can guide summary format, audience, emphasis, and focus before generation in Summarize Text.
- Generated Summarize Text history records include backward-compatible metadata.
- The default Summarize Text flow remains one-step and usable.

### Milestone 1: Website And Simplify Writing Controls

User value: remaining text tools gain useful control without adding clutter.

Implementation intent:

- Extend appropriate controls to Summarize Website and Simplify Writing.
- Add website-summary controls such as summary format, audience, and source focus where they complement the existing URL/focus fields.
- Add simplification controls such as output format and audience where they complement the existing reading-level selector.
- Carry generation settings into history metadata for these tools.
- Keep credit costs visible and action-based.

Acceptance criteria:

- Website-summary and simplification users can guide output shape without writing long prompt instructions.
- Generated history records from supported text tools include backward-compatible metadata.
- Existing default flows remain one-step and usable.

### Milestone 2: Text Revision Actions

User value: users can improve a result instead of starting over.

Implementation intent:

- Add revision actions after text generation and on expanded text history items: make clearer, shorter, more persuasive, change tone, add examples, and create alternatives.
- Use existing authenticated, idempotent, credit-aware generation paths.
- Save revisions with `derivedFromId`, source tool, revision action, and generation settings.
- Add a simple original/revised comparison where space allows.

Acceptance criteria:

- A user can revise and save a text output.
- The original item is preserved.
- Credit debit, failure, idempotency, and refund behavior match existing generation.

### Milestone 3: History Organization And Continuation

User value: saved work becomes the place where work continues.

Implementation intent:

- Add filters for output type, tool, date, and derived status.
- Let users rename saved outputs and add short notes.
- Show source/derived relationships more clearly.
- Add "continue in chat" from text history items with prompt/output context.
- Expand repurpose targets into a focused set: social pack, email sequence, blog outline, image prompt, chat follow-up.

Acceptance criteria:

- Users can find prior work faster.
- A saved output can lead naturally to another deliverable.
- Source relationships remain understandable.

### Milestone 4: Account Data Deletion Completeness

User value: account deletion matches user expectations and the trust promised by account/privacy surfaces.

Implementation intent:

- Expand account deletion beyond `profile/userData` and Firebase Auth deletion.
- Delete or anonymize user-created content subcollections such as chats, summaries, idempotency records, rate-limit docs, and locks.
- Decide and document any payment or credit ledger records that must be retained for legal, tax, fraud, or support reasons.
- Remove generated image files under the user's Storage prefix where feasible.
- Show a clear failure state if deletion cannot complete.

Acceptance criteria:

- Deleting an account removes Firebase Auth access and no longer leaves saved prompts, outputs, or generated images casually accessible under the user's UID.
- Any retained billing records are explicitly documented and minimize prompt/output content.
- The delete flow reports success only after required cleanup succeeds.

### Milestone 5: Image Generation Request Controls

User value: image creation feels predictable, controllable, and easy to diagnose.

Implementation intent:

- Expand user-facing request controls where provider behavior and pricing are predictable.
- Improve image generation error copy for rate limiting, provider failures, and missing keys.
- Add a non-provider test path for image request state where feasible without calling Fireworks.

Acceptance criteria:

- Users understand whether an image request failed because of credits, rate limits, provider keys, or provider failure.
- New controls show exact credit cost before generation.
- Credits, rate limits, idempotency, and refunds remain deterministic.

### Milestone 6: Single-User Projects And Brand Voice

User value: repeated work across clients, classes, campaigns, or topics has reusable context.

Implementation intent:

- Add `users/{uid}/projects/{projectId}`.
- Keep v1 single-user while reserving ownership/collaborator fields.
- Allow history items to link to a project.
- Add project fields for goal, audience, tone/brand voice, source notes, and default model/settings.
- Allow project context to prefill generation controls.
- Add project filtering in History.

Acceptance criteria:

- Users can group outputs by project.
- Project context can be reused in Chat and Tools.
- Existing non-project workflows remain unchanged.

### Milestone 7: Saved Prompts And Template Gallery

User value: repeatable creative workflows can be rerun without rebuilding prompts.

Implementation intent:

- Add saved prompt templates with variables such as `{topic}`, `{audience}`, `{tone}`, and `{format}`.
- Add a small gallery organized by job-to-be-done.
- Allow template runs from Chat or Tools.
- Save outputs to History with template metadata.
- Allow templates to optionally use project context.

Acceptance criteria:

- Users can save and rerun a prompt template.
- Template outputs can be found, revised, and linked to projects later.
- Template runs follow existing auth, credit, idempotency, and refund behavior.

### Milestone 8: Image Studio v1

User value: visual output becomes controllable and connected to writing workflows.

Implementation intent:

- Add image controls only where provider behavior and pricing are predictable: aspect ratio, style preset, and multi-variation packs if supported.
- Show exact credit cost before generation.
- Add a prompt enhancer that improves a short visual idea before spending image credits.
- Generate image prompts from text history items.
- Add an image gallery filter/view in History.
- Replace placeholder share behavior with practical export/share actions where feasible.

Acceptance criteria:

- Users can make visible image choices before generation.
- Text history can feed image creation without manual copy/paste.
- Image history is browsable as a reusable gallery.

### Milestone 9: Chat Workspace Connections

User value: Chat becomes a planning and continuation surface, not only a question-answer page.

Implementation intent:

- Add chat modes such as brainstorm, critique, rewrite, plan, research summary, and campaign builder.
- Allow Chat to reference selected history items or project context.
- Add "send to tool" actions from chat responses.
- Add save-as-summary, save-as-template, and save-to-project actions.
- Show what prior context is being sent.

Acceptance criteria:

- Users can continue from prior saved work inside Chat.
- Users can move from Chat to a tool output and back.
- Context use is visible and controllable.

### Milestone 10: Product Analytics And Credit Conversion

User value: credit prompts and checkout become clearer, while the team can measure activation and revenue flow.

Implementation intent:

- Add a browser-only Firebase/GA4 analytics helper using the existing measurement ID.
- No-op safely on server and unsupported browsers.
- Track bounded metadata only; never raw prompts, generated content, keys, auth tokens, secrets, or full sensitive URLs.
- Add events for sign-in started/completed, generation started/succeeded/failed/refunded, paywall shown, checkout started/confirmed, credits depleted.
- Improve insufficient-credit modal with required credits, current balance, recommended pack, buy credits, and API-key alternative.
- Improve account ledger labels for credits spent and purchased.

Acceptance criteria:

- Low-credit users understand the blocker and next action.
- Product events can measure activation, generation success, paywall, checkout, and repeat usage.
- Analytics initialization is safe in browser, server, and WebView contexts.

### Milestone 11: Payment Reliability And Support Diagnostics

User value: money-path failures can be prevented, detected, and explained.

Implementation intent:

- Add targeted tests for credit math, idempotency, and payment confirmation.
- Add Stripe webhook handling or scheduled reconciliation if return-page confirmation remains the only fulfillment path.
- Add structured server logs for generation, credit, payment, proxy, and refund failures.
- Add a support runbook for manual inspection of payment, ledger, idempotency, and refund records.

Acceptance criteria:

- Critical money paths have automated coverage.
- Failed or ambiguous payment/credit operations leave an auditable trail.
- Support can diagnose common issues without guessing at Firestore structure.

### Milestone 12: Performance, Draft Resilience, And Mobile Ergonomics

User value: long creative work feels safer and faster.

Implementation intent:

- Add clearer progress phase labels for scraping, thinking, writing, saving, and refunding where relevant.
- Persist long draft inputs locally so navigation/refresh does not lose work.
- Review expensive markdown, image, chat, and history rendering paths.
- Keep lists bounded and Firestore listeners stable.
- Improve mobile Tools and History ergonomics.

Acceptance criteria:

- Users understand what the app is doing while generation runs.
- Long inputs survive common interruptions.
- Chat, Tools, and History remain smooth with realistic saved data volumes.

### Milestone 13: Admin Support Tools v1

User value: routine credit/payment support can happen safely without direct database edits.

Implementation intent:

- Add server-authorized admin/support workflows for:
  - user lookup by email;
  - payment and ledger history review;
  - grant credits with reason;
  - reverse credits with reason;
  - investigate failed refunds.
- Add audit records for every support mutation.
- Keep admin authorization distinct from normal signed-in user auth.

Acceptance criteria:

- Common support issues can be resolved without direct Firestore edits.
- Every manual credit adjustment records actor, reason, timestamp, and balance-after value.
- Admin routes are inaccessible to normal users.
