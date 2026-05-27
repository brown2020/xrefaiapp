# AGENTS.md - Xref.ai Codebase Guide

## Purpose

`AGENTS.md` is the single source of truth for autonomous coding agents working in this repository. Read it before editing code. Read `spec.md` before product-facing work.

This guide is intentionally repo-specific. It documents the current application, the boundaries that protect users and money movement, and the workflow expected when committing directly to `dev`.

## Project Overview

Xref.ai is an AI creation workspace for writing, chat, summarization, image prompts, image generation, saved history, and credit-based usage. It is built with Next.js 16 App Router, React 19, TypeScript 6 strict mode, Tailwind CSS 4, Firebase, Stripe Checkout, Fireworks AI, and the Vercel AI SDK.

## Product Purpose

The app helps users turn rough ideas, URLs, notes, text, and visual concepts into useful outputs they can save and reuse. The current product is strongest for creator, marketer, student, and researcher workflows:

- start from a use case on the homepage;
- sign in with Firebase Auth;
- generate text, summaries, chat responses, or images;
- save outputs into account history;
- repurpose text history into common deliverables;
- buy credits through Stripe on web or through signed native IAP messages in the Expo WebView path;
- optionally bring provider API keys instead of spending credits.

For product direction, roadmap milestones, and user-facing promises, use `spec.md`.

## Branch And Git Workflow

This repository uses:

- `main` as the stable production branch.
- `dev` as the autonomous working branch.

Rules for autonomous runs:

- Never push to `main`.
- Do not create feature branches unless the user explicitly changes the workflow.
- Make one focused PR-sized change at a time, even though the change is committed directly to `dev`.
- Start by fetching remote refs, switching to `dev`, integrating the latest `origin/dev`, and inspecting the working tree.
- If `origin/dev` does not exist and the user explicitly asked to work on `dev`, create `dev` from the latest stable remote base only after documenting that assumption. Do not move or push `main`.
- If uncommitted changes already exist, treat them as user-owned. Stop unless they are clearly generated/irrelevant and can be preserved without staging or overwriting them.
- Before committing, confirm the branch is `dev`, fetch again, integrate `origin/dev` if it exists, rerun required validation, then commit and push `dev` to `origin/dev`.
- Do not open pull requests for the direct-to-`dev` workflow unless the user asks.

Preferred non-interactive sequence:

```bash
git fetch origin
git switch dev
git merge --ff-only origin/dev
git status --short --branch
```

If `origin/dev` is missing, do not invent unrelated branch names. Keep the work on `dev`.

## Quick Commands

Use npm. This repository has `package-lock.json` lockfile version 3. Do not switch package managers.

```bash
npm install        # Install dependencies using npm
npm run dev        # Start Next.js dev server
npm run build      # Production build and Next.js type checks
npm run start      # Start production server after build
npm run lint       # ESLint 10 flat config
npm run test:browser # Headless Playwright smoke tests
```

Canonical validation for documentation-only changes:

```bash
npm run lint
./node_modules/.bin/tsc --noEmit --pretty false
npm run build
```

Canonical validation for routing, server action, API, auth, payment, credit, shared UI, or visible frontend changes:

```bash
npm run lint
./node_modules/.bin/tsc --noEmit --pretty false
npm run build
npm run test:browser
```

`npm run test:browser` uses Playwright headlessly and starts `npm run start` on `127.0.0.1` via `playwright.config.ts`. Run `npm run build` first because `next start` needs a production build.

## Non-Interactive Testing Rules

- Never use watch mode.
- Never use a headed browser.
- Never rely on manual login.
- Use CI-safe commands only.
- Prefer existing scripts over ad hoc commands.
- If a check is unavailable or blocked by environment credentials, say exactly which check could not run and why.
- Browser checks for visible UI work should use headless Playwright or the Codex in-app browser; do not ask the user to manually verify basics you can verify.

## Current Tech Stack

- Framework: Next.js 16 App Router. `src/proxy.ts` replaces legacy middleware.
- Runtime: React 19, TypeScript 6 strict mode, Node route handlers where declared.
- Styling: Tailwind CSS 4 through `@tailwindcss/postcss`, plus shared utilities in `src/app/globals.css`.
- UI libraries: `lucide-react`, Radix Dialog, `react-markdown` with `remark-gfm`, `react-hot-toast`, `react-select`, `react-textarea-autosize`.
- State: Zustand 5, with `useShallow` for multi-field selectors.
- Auth/data/storage: Firebase client SDK 12 and Firebase Admin 13 for Auth, Firestore, and Storage.
- AI text: Vercel AI SDK 6 with OpenAI, Anthropic, xAI, and Google providers.
- AI images: Fireworks AI `stable-diffusion-xl-1024-v1-0`.
- Payments: Stripe 22 Checkout Sessions on web plus signed React Native WebView IAP confirmation.
- Tests: Playwright smoke tests under `tests/`; no unit test runner is currently configured.

## Repository Structure

```text
src/
  actions/        Server actions for auth, credits, history, payments, profile, text AI, image AI, IAP
  ai/             Model whitelist and text model factory
  app/            App Router pages and API route handlers
  components/     UI components and feature surfaces
  constants/      Routes, credit costs, credit packs, starter intents, tool metadata, shared limits
  data/           Static choice lists for image/design prompt builders
  firebase/       Firebase client setup and lazy Admin SDK proxies
  hooks/          Auth, store init, chat/history, scraping, generation, Firestore hooks
  types/          Domain types and runtime type guards
  utils/          Credits, idempotency, rate limit, errors, messages, platform, clipboard, proxy helpers
  zustand/        Auth, profile, payments, paywall, and initialization stores
  proxy.ts        Edge soft gate for protected routes

tests/
  activation-starter-paths.spec.ts
```

Root config files include `package.json`, `package-lock.json`, `next.config.mjs`, `eslint.config.mjs`, `playwright.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, and `tsconfig.json`.

## Key Features That Exist Today

- Public homepage with hero, starter paths, feature sections, auth CTA, and responsive typewriter sizing.
- Public `/about`, `/terms`, `/privacy`, and `/support` pages using shared public-page layout components.
- Firebase auth with Google sign-in, email/password, password reset, and email-link sign-in.
- Protected Chat, Tools, History, Account, payment attempt, and payment success routes.
- Streaming AI chat through `/api/chat`.
- Writing tools: Summarize Website, Summarize Text, Freestyle Writing, Simplify Writing.
- Image tools: Generate Image and Designer Tool.
- Firestore-backed saved chat and summary history.
- History search, pagination, expandable cards, markdown rendering, copy/download, and text repurpose actions.
- Credit balances, credit ledger, credit packs, Stripe checkout, payment confirmation, and paywall modal.
- BYO API key mode for text providers and Fireworks image generation.
- Expo/React Native WebView branches for IAP, auth differences, cookie consent suppression, and localStorage differences.
- Headless Playwright coverage for activation starter paths.

## Core Architecture

### Server And Client Boundaries

- Server actions live in `src/actions/*.ts` and are marked `"use server"` where required.
- API routes live in `src/app/api/**/route.ts` and use `runtime = "nodejs"` where Node APIs or SDKs are required.
- Interactive UI is client-side. `ClientProvider` owns auth token refresh, store initialization, cookie consent, toasts, paywall modal, and logout redirects.
- Do not import server-only Firebase Admin modules into client components.
- Do not move credit, payment, auth, idempotency, or rate-limit decisions to the client.

### Chat Path

The active chat UI is `src/components/Chat.tsx` using `@ai-sdk/react` and `DefaultChatTransport` pointed at `/api/chat`.

`/api/chat`:

- verifies auth with `requireAuthedUid()` from the auth cookie;
- rate-limits the user under endpoint `chat`;
- debits `CREDITS_COSTS.chatMessage` when in credits mode;
- gates debits with idempotency;
- streams with `streamText`;
- refunds and clears idempotency on stream failure or abort;
- saves chat history from the client after successful stream completion.

`src/hooks/useChatGeneration.ts` is a legacy exported hook that is not used by the current Chat component. Prefer `Chat.tsx` plus `/api/chat` for chat work.

### Tool Text Generation Path

Writing tools call `generateAIResponse()` through `generateResponse()` in `src/actions/generateAIResponse.ts`. This path:

- verifies auth when credits are used;
- calculates text-generation cost from requested word count;
- idempotency-gates debits;
- streams through AI SDK RSC streamable values;
- refunds on generation errors;
- saves summaries through `saveHistoryServer()`.

### Image Generation Path

`generateImage()` in `src/actions/generateImage.ts`:

- always requires an authenticated user;
- uses server `FIREWORKS_API_KEY` in credits mode or the profile Fireworks key in API-key mode;
- debits `CREDITS_COSTS.imageGeneration` in credits mode;
- uploads generated JPEGs to Firebase Storage and returns a signed URL;
- saves image outputs as history entries with `words: "image"`.

Important current limitation: image clients do not yet pass a fresh client idempotency key, so image generation falls back to payload-hash idempotency. This protects retries but can collapse intentional identical re-submits until the idempotency record expires.
`generateImage()` already accepts an optional `idempotencyKey`; close this by updating the Generate Image and Designer Tool clients to pass `createClientIdempotencyKey()` rather than changing the server-side idempotency model.

### Authentication And Route Protection

- `src/proxy.ts` is a soft edge gate. It checks for auth cookie presence only.
- Protected routes are defined in `src/constants/routes.ts` and mirrored in the proxy matcher.
- Every mutation and money path must verify the Firebase ID token server-side.
- Server actions use `requireAuthedUid()` from `src/actions/serverAuth.ts`.
- Billing and proxy API routes use `requireAuthedUidFromRequest()` so browser cookies and React Native Bearer tokens both work.
- `/api/chat` currently uses cookie-based `requireAuthedUid()`.
- `useAuthToken()` writes the Firebase ID token to the `xrefAuthToken` cookie before profile sync and refreshes it on interval/focus/visibility.
- Do not treat proxy access as authorization. A forged or expired cookie must still fail at the server action/API layer.

### Credits And Payments

Source files:

- `src/constants/credits.ts`
- `src/constants/creditPacks.ts`
- `src/actions/serverCredits.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/confirm/route.ts`
- `src/actions/confirmIapPurchase.ts`
- `src/components/ui/CreditsPaywallModal.tsx`
- `src/components/CreditsLedger.tsx`

Invariants:

- Credit balances are non-negative integers.
- Credit debits and credits happen inside Firestore transactions.
- Ledger entries accompany credit mutations.
- Chargeable operations are idempotency-protected.
- Refunds use deterministic IDs where needed.
- Stripe confirmation validates auth, metadata UID, payment status, pack ID, and amount before crediting.
- Stripe fulfillment uses a Firestore lock at `users/{uid}/locks/payment_{sessionId}`.
- IAP fulfillment verifies HMAC signature, timestamp freshness, max credits, and global transaction claim docs.
- Payment confirmation is currently return-page driven; there is no Stripe webhook route yet.

### Firestore Data Model

```text
users/{uid}/
  profile/userData
  chats/{autoId}
  summaries/{autoId}
  payments/{docId}
  creditsLedger/{docId}
  idempotency/{key}
  rateLimit/{endpoint}
  locks/payment_{sessionId}

iapTransactions/{transactionId}
```

Profile strings from client writes are allowlisted and clamped in `serverProfile.ts`. History strings are clamped in `serverHistory.ts`.

Account deletion currently calls `deleteAccountServer()` from `serverProfile.ts`, which deletes `users/{uid}/profile/userData` and the Firebase Auth user. It does not cascade `chats`, `summaries`, `payments`, `creditsLedger`, `idempotency`, `rateLimit`, `locks`, global IAP claim docs, or generated Storage files. Treat complete account-data deletion as an open product/privacy gap until implemented.

### State Management

- `useAuthStore` tracks Firebase auth details and profile sync status.
- `useProfileStore` stores profile/credits and performs serialized optimistic profile updates with rollback.
- `usePaymentsStore` fetches payment history. Its `addPayment` path is currently not used by the UI; Stripe and IAP are the real purchase flows.
- `usePaywallStore` keeps paywall context across close to avoid flicker.
- `useInitializeStores` resets profile/payments on UID changes and fetches profile after auth sync or timeout.
- Use `useShallow` for multi-field Zustand selectors.
- Use refs for realtime listener callbacks/state that should not resubscribe on UI-only changes.

### Realtime And Pagination

- Chat uses `useChatMessages()` and `useFirestoreRealtime()` for live first-page updates plus older-page pagination.
- History uses `useFirestorePagination()` and local optimistic additions for saved repurpose outputs.
- Keep page sizes tied to `MAX_CHAT_LOAD`, `MAX_HISTORY_LOAD`, and `MAX_VISIBLE_CHATS`.

### URL Proxy

`GET /api/proxy` is used by the website summarizer. It must remain SSRF-hardened:

- auth required;
- rate-limited;
- HTTPS only;
- default port 443 only;
- no credentials in target URL;
- no IP literal hostnames;
- DNS-resolves target and connects directly to the verified public IP;
- blocks private/link-local/reserved IP ranges;
- rejects redirects;
- caps response body at 1 MB;
- times out at 8 seconds.

Do not replace it with plain `fetch(targetUrl)` unless the same protections are rebuilt.

### Expo WebView Support

React Native WebView support is intentional:

- `window.ReactNativeWebView` detection lives in `src/utils/platform.ts` and `src/hooks/useClientSetup.ts`.
- Google popup sign-in is hidden in WebView.
- Web Stripe checkout controls are hidden in WebView; native purchase starts with `INIT_IAP`.
- Native success returns `IAP_SUCCESS`, then `confirmIapPurchase()` verifies the signed payload.
- Cookie consent is suppressed in WebView.
- Some localStorage coordination is skipped in WebView.
- The restricted-word guard is client-only and WebView-only. It is UX protection, not server moderation.

Do not remove WebView branches as dead code.

## Development Conventions

- Keep changes scoped to the requested behavior.
- Use existing constants, route maps, hooks, stores, UI primitives, type guards, auth helpers, credit helpers, and idempotency helpers.
- Prefer structured parsers and type guards over ad hoc unknown-data handling.
- Keep security-sensitive refactors small and reviewable.
- Do not casually remove `package.json` overrides; they pin patched transitive versions.
- Do not modify generated files such as `.next/`, `tsconfig.tsbuildinfo`, Playwright trace output, or local test build artifacts.
- Do not read or print local secret files such as `.env`, `.env.local`, or `service_key.json`.

## TypeScript And Lint Expectations

- TypeScript is strict. Avoid `as` casts when a runtime guard from `src/types/guards.ts` fits.
- `@/*` maps to `./src/*`.
- `eslint.config.mjs` is an ESLint 10 flat config, intentionally not `eslint-config-next`.
- Hooks lint is limited to classic `rules-of-hooks` and `exhaustive-deps`; do not enable React Compiler rules without auditing the app.
- Warnings are allowed by current config, but new warnings should be avoided when practical.

## Testing Expectations

- Run `npm run lint` for all changes.
- Run `./node_modules/.bin/tsc --noEmit --pretty false` when TypeScript behavior or public types changed, and as part of the canonical validation pass.
- Run `npm run build` for routing, server action, API, auth, payment, credit, shared UI, or config changes.
- Run `npm run test:browser` for visible UI, activation, routing, homepage, auth modal, protected-route, paywall, or starter-path changes.
- Add or update Playwright tests for new user-visible flows that can be verified without manual login.
- No formatter script is configured. Do not invent a new formatter command for routine validation unless the project adds one.
- There is no unit test runner configured. If adding one, keep it intentional and document the new command here.

## Files Requiring Extra Caution

High-risk money/auth/data paths:

- `src/actions/serverAuth.ts`
- `src/utils/requireAuthedRequest.ts`
- `src/proxy.ts`
- `src/actions/serverCredits.ts`
- `src/actions/generateAIResponse.ts`
- `src/actions/generateImage.ts`
- `src/utils/idempotency.ts`
- `src/utils/rateLimit.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/confirm/route.ts`
- `src/app/api/proxy/route.ts`
- `src/actions/confirmIapPurchase.ts`
- `src/actions/serverProfile.ts`
- `src/actions/serverHistory.ts`
- `src/firebase/firebaseAdmin.ts`

High-risk UX/platform paths:

- `src/hooks/useAuthToken.ts`
- `src/components/ClientProvider.tsx`
- `src/components/AuthComponent.tsx`
- `src/components/Home.tsx`
- `src/app/globals.css`
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/components/PublicPageLayout.tsx`
- `src/components/ProfileComponent.tsx`
- `src/components/ui/CreditsPaywallModal.tsx`
- `src/components/Chat.tsx`
- `src/components/Tools.tsx`
- `src/components/History.tsx`

## Deployment And Infrastructure Notes

- No `vercel.json`, `firebase.json`, Dockerfile, GitHub Actions workflow, cron config, or queue worker config is present in the repository.
- Deployment is currently inferred to be a standard Next.js deployment driven by `package.json`, `next.config.mjs`, environment variables, and the hosting platform configuration outside this repo.
- `public/.well-known/apple-app-site-association` and `public/.well-known/assetlinks.json` support native app/WebView association paths. Do not remove them as unused website assets.
- `next.config.mjs` allows Firebase/Google Storage image hosts and has `reactStrictMode: false`; re-enabling Strict Mode requires auditing auth/profile effects first.

## Environment Variables

Firebase client:

- `NEXT_PUBLIC_FIREBASE_APIKEY`
- `NEXT_PUBLIC_FIREBASE_AUTHDOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECTID`
- `NEXT_PUBLIC_FIREBASE_STORAGEBUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID`
- `NEXT_PUBLIC_FIREBASE_APPID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENTID`

Firebase Admin:

- `FIREBASE_TYPE`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_AUTH_URI`
- `FIREBASE_TOKEN_URI`
- `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`
- `FIREBASE_CLIENT_CERTS_URL`

`.env.example` includes `FIREBASE_UNIVERSE_DOMAIN`, but `src/firebase/firebaseAdmin.ts` does not currently read it.

AI providers:

- `OPENAI_API_KEY`
- `OPENAI_ORG_ID` optional
- `ANTHROPIC_API_KEY`
- `XAI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `FIREWORKS_API_KEY`

Billing/runtime:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PRODUCT_NAME`
- `APP_URL`
- `NEXT_PUBLIC_COOKIE_NAME`
- `IAP_WEBVIEW_SECRET`

Legacy/sample env files may mention `NEXT_PUBLIC_STRIPE_KEY` and `NEXT_PUBLIC_CREDITS_PER_IMAGE`, but the active web checkout and credit pricing code do not currently read them.

## Background Jobs And Automations

No cron jobs, queues, or scheduled background workers are configured in this repository.

Cleanup helpers exist but are not scheduled:

- `cleanupExpiredIdempotencyRecords(uid)`
- `cleanupRateLimitData(uid)`

Do not claim these run automatically unless infrastructure is added.

## Definition Of Done

A change is done when:

- it is scoped to one focused PR-sized objective;
- docs and source agree about current product behavior;
- auth, credits, payments, idempotency, rate limits, WebView behavior, and server/client boundaries remain intact;
- relevant validation commands pass or blockers are clearly documented;
- visible UI changes are checked at desktop and mobile sizes;
- generated/local artifacts are not staged;
- the work is committed on `dev` and pushed to `origin/dev` when the user requested direct-to-dev workflow.

## Stop Conditions

Stop and report instead of continuing when:

- uncommitted user changes would need to be overwritten;
- the branch is not `dev` and cannot be safely switched;
- `main` would need to be pushed;
- remote integration produces conflicts you cannot resolve confidently;
- required secrets or services are unavailable and the task cannot be meaningfully validated;
- a requested change would weaken auth, credit, payment, idempotency, SSRF, or IAP protections without explicit approval;
- validation reveals failures outside the task scope that are unsafe to change casually.

## Current Known Architecture Notes

- `/api/chat` is the active chat streaming path; `useChatGeneration` is legacy/unused.
- `usePaymentsStore.addPayment()` and `serverPayments.addPaymentServer()` are not currently connected to user-facing purchase UI.
- `buildContextFromHistory()` and `truncateText()` in `src/utils/messages.ts` are exported but not used by the active chat path.
- `GenerationNextActions` exists for fresh text tool outputs, but expanded History cards currently expose repurpose actions only; "continue in chat" from History is still roadmap work.
- `src/constants/index.ts` contains some historical constants that are not read by active server paths, such as `IDEMPOTENCY_TIME_WINDOW_MS` and the exported rate-limit constants. Check actual imports before treating constants as active behavior.
- Image generation idempotency should eventually be moved to fresh client request IDs like text generation.
- Payment confirmation is return-page driven; Stripe webhooks or reconciliation are future reliability work.
- Firebase/GA4 measurement config exists, but there is no product analytics helper yet.
