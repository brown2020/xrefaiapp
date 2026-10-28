# AGENTS.md - Xref.ai Codebase Guide

## Purpose

`AGENTS.md` is the single source of truth for autonomous coding agents working in this repository. Read it before editing code. Read `spec.md` before product-facing work.

This guide is intentionally repo-specific. It documents the current application, the boundaries that protect users and money movement, and the workflow expected when committing directly to `dev`.

## Project Overview

Xref.ai is an AI creation workspace for writing, chat, summarization, image prompts, image generation, saved history, and credit-based usage. It is built with Next.js 16 App Router, React 19, TypeScript 6 strict mode, Tailwind CSS 4, Firebase, Stripe Checkout, and the Vercel AI SDK.

## Product Purpose

The app helps users turn rough ideas, URLs, notes, text, and visual concepts into useful outputs they can save and reuse. The current product is strongest for creator, marketer, student, and researcher workflows:

- start from a use case on the homepage;
- sign in with Firebase Auth;
- generate text, summaries, chat responses, or images;
- save outputs into account history;
- repurpose text history into common deliverables;
- buy credits through Stripe on web (the Expo app does not sell credits; purchase UI is hidden in the WebView);
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
npm run typecheck # tsc --noEmit
npm run test # Contract tests in tests/code-reliability.spec.ts; needs a server already on the Playwright base URL
npm run doctor # React Doctor 0.9.14, full scope (pinned)
npm run prove:workflows # Critical workflows on Firebase emulators + local model fixture; no paid calls
npm run prove:deletion # Full account deletion on Auth/Firestore/Storage emulators; needs npm run build
npm run prove:state # Account switch and credits badge vs ledger on emulators, headless
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
- Runtime: React 19, TypeScript 6 strict mode, Node route handlers where declared. TypeScript 7 type-checks this project, but typescript-eslint 8 needs the TypeScript 6 compiler API, so stay on 6 until typescript-eslint supports 7.
- Styling: Tailwind CSS 4 through `@tailwindcss/postcss`, `@tailwindcss/typography` for rendered markdown (`prose`), plus shared utilities in `src/app/globals.css`. Shared input, select, card, and button class names live in `src/components/ui/FormInput.tsx`.
- UI libraries: `lucide-react`, Radix Dialog, `react-markdown` with `remark-gfm`, `react-hot-toast`, `react-select`, `react-textarea-autosize`.
- State: Zustand 5, with `useShallow` for multi-field selectors.
- Auth/data/storage: Firebase client SDK 13 and Firebase Admin 14 for Auth, Firestore, and Storage. Admin uses the modular entry points (`firebase-admin/app`, `/auth`, `/firestore`, `/storage`); the namespaced `admin.firestore()` API no longer exists.
- AI text: Vercel AI SDK 7 with OpenAI, Anthropic, xAI, and Google providers. Use `instructions` and `onEnd` (not `system` and `onFinish`) on `streamText`.
- AI images: OpenAI `gpt-image-2` via AI SDK `generateImage` (`IMAGE_MODEL_ID` in `src/ai/models.ts`). Fireworks shut down image generation in August 2026.
- Payments: Stripe 23 Checkout Sessions on web. The signed IAP confirmation action is still in the code, but no client imports it, so Next.js does not expose it; `prove:workflows` skips its IAP section until a native purchase flow imports it again.
- Tests: Playwright specs under `tests/` cover activation starter paths, auth entry, proxy route protection, API auth rejection, redirect normalization, writing-control surfaces, and source/contract checks in `code-reliability.spec.ts`. No unit test runner is currently configured.

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
  types/          Domain types
  utils/          Credits, idempotency, rate limit, errors, messages, platform, clipboard, proxy helpers
  zustand/        Auth, profile, payments, paywall, and initialization stores
  proxy.ts        Edge soft gate for protected routes

tests/
  activation-starter-paths.spec.ts
  auth-entry.spec.ts
  code-reliability.spec.ts
  route-protection.spec.ts
  writing-controls.spec.ts
```

Root config files include `package.json`, `package-lock.json`, `next.config.mjs`, `eslint.config.mjs`, `playwright.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, and `tsconfig.json`.

## Key Features That Exist Today

- Public homepage with hero, starter paths, feature sections, auth CTA, and responsive typewriter sizing.
- Public `/about`, `/terms`, `/privacy`, and `/support` pages using shared public-page layout components.
- Dedicated `/login` and `/signup` pages. Protected routes redirect signed-out requests to `/login?next=<path>`, and a successful sign-in returns there.
- Firebase auth with Google sign-in, email/password, password reset, and email-link sign-in.
- Protected Chat, Tools, History, Account, payment attempt, and payment success routes.
- Streaming AI chat through `/api/chat`.
- Writing tools: Summarize Website, Summarize Text with summary controls, Freestyle Writing with deliverable controls, Simplify Writing.
- Image tools: Generate Image and Designer Tool.
- Firestore-backed saved chat and summary history.
- History search, pagination, expandable cards, markdown rendering, copy/download, text repurpose actions, per-item delete, and Clear all (`deleteHistoryItemServer()` / `clearHistoryServer()` in `serverHistory.ts`; summaries only, generated Storage files stay).
- Credit balances, credit ledger, credit packs, Stripe checkout, payment confirmation, and paywall modal.
- BYO API key mode for text providers; image tools use the profile OpenAI key in that mode.
- Expo/React Native WebView branches for IAP, auth differences, cookie consent suppression, and localStorage differences.
- Headless Playwright coverage for activation starter paths, protected/public route behavior, unauthenticated API rejection, payment-success redirect normalization, Freestyle Writing controls, and Summarize Text controls.

## Core Architecture

### Server And Client Boundaries

- Server actions live in `src/actions/*.ts` and are marked `"use server"` where required.
- API routes live in `src/app/api/**/route.ts` and use `runtime = "nodejs"` where Node APIs or SDKs are required.
- Interactive UI is client-side. `ClientProvider` owns auth token refresh, store initialization, cookie consent, the AI consent modal, toasts, paywall modal, and logout redirects.
- `AiConsentModal` blocks signed-in users until they allow sending their content to the providers in `src/constants/aiConsent.ts` (Apple guideline 5.1.2). `recordAiConsentServer()` stores `aiConsentVersion` and `aiConsentAt` on the profile; clients cannot write those fields. Declining signs out. Privacy, terms, support, and account stay reachable. Bump `AI_CONSENT_VERSION` when providers or shared data change. `prove:state` proves allow, persistence, and decline.
- Do not import server-only Firebase Admin modules into client components.
- Do not move credit, payment, auth, idempotency, or rate-limit decisions to the client.

### Chat Path

The active chat UI is `src/components/Chat.tsx` using `@ai-sdk/react` and `DefaultChatTransport` pointed at `/api/chat`.

`/api/chat`:

- parses the body with the shared chat schema and returns 400 for a malformed payload before any credit mutation;
- rejects a user message over 5,000 words or 40,000 characters before debiting, and drops older history that does not fit in that same budget;
- verifies auth with `requireAuthedUidFromRequest()` (Bearer token or auth cookie);
- rate-limits the user under endpoint `chat`;
- debits `CREDITS_COSTS.chatMessage` when in credits mode;
- gates debits with idempotency;
- streams with `streamText`;
- refunds and clears idempotency on stream failure or abort;
- refunds and clears idempotency when the stream finishes with no text (for example a content filter); the client restores the prompt and saves nothing;
- saves chat history from the client after successful stream completion.

Chat work should use `Chat.tsx` plus `/api/chat`. (A previously legacy `useChatGeneration` hook has been removed.)

### Tool Text Generation Path

Writing tools call `generateAIResponse()` through `generateResponse()` in `src/actions/generateAIResponse.ts`. This path:

- always verifies auth before building a model, including API-key mode;
- rejects a malformed generation payload before debiting credits;
- trims the prompt sent to the provider to 5,000 words and 40,000 characters before debiting;
- calculates text-generation cost from requested word count;
- idempotency-gates debits;
- streams through AI SDK RSC streamable values;
- refunds on generation errors and on a completion with no text; writing clients throw `EmptyCompletionError` so nothing is saved;
- saves summaries through `saveHistoryServer()`.

Freestyle Writing adds client-side controls for deliverable, tone, audience, length, and call to action. Summarize Text adds client-side controls for summary format, audience, emphasis, and focus. These controls only shape the generated prompt and optional history metadata; credit cost remains based on requested word count.

### Image Generation Path

`generateImage()` in `src/actions/generateImage.ts`:

- always requires an authenticated user;
- calls OpenAI `IMAGE_MODEL_ID` with server `OPENAI_API_KEY` in credits mode or the profile OpenAI key in API-key mode (`IMAGE_MISSING_OPENAI_KEY` when absent);
- debits `CREDITS_COSTS.imageGeneration` in credits mode;
- rate-limits authenticated image requests under endpoint `image`;
- requests a medium-quality 1024x1024 JPEG with no retries and aborts after `IMAGE_PROVIDER_TIMEOUT_MS` (100s), which must stay below the `/tools` route's `maxDuration` (120s): Vercel kills a timed-out function without running the refund;
- uploads the generated JPEG to Firebase Storage under `generated/{uid}/` and returns a v4 signed URL that expires in under 7 days. History stores `storagePath` and refreshes the URL; deleting a history row deletes that object. Account deletion still removes `generated/{uid}/`;
- logs provider failures server-side and returns `IMAGE_CONTENT_REJECTED` or `IMAGE_GENERATION_FAILED` (`src/utils/imageErrors.ts`) so the UI only blames the prompt for real content-policy refusals;
- saves image outputs as history entries with `words: "image"`.

Image clients pass a fresh client idempotency key so retries can be deduplicated without collapsing intentional repeat generations. Keep the payload-hash fallback for legacy/defensive server-side use.

### Authentication And Route Protection

- `src/proxy.ts` is a soft edge gate. It checks for auth cookie presence only.
- Protected routes are defined in `src/constants/routes.ts` and mirrored in the proxy matcher.
- Every mutation and money path must verify the Firebase ID token server-side with `checkRevoked: true`. Allowed sign-in providers are `password`, `google.com`, and `emailLink`.
- Server actions use `requireAuthedUid()` from `src/actions/serverAuth.ts`.
- Billing, chat, and proxy API routes use `requireAuthedUidFromRequest()` so browser cookies and React Native Bearer tokens both work.
- `POST /api/auth/session` verifies the Firebase ID token and sets `xrefAuthToken` as an HttpOnly cookie. Clients do not write that cookie from JavaScript.
- `isAdminConfigured()` in `src/firebase/firebaseAdmin.ts` is true for the emulators or when `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are set. Without it, the session route returns 503 and logs `Auth session unavailable`, and both `requireAuthedUid()` and `requireAuthedUidFromRequest()` throw `AUTH_REQUIRED` before touching the SDK. For local or CI runs without Admin, `ALLOW_UNVERIFIED_SESSION_COOKIE=true` makes the session route set the soft-gate cookie unverified. That flag is ignored when `NODE_ENV` is `production`. The cookie still never authorizes spend or APIs.
- The auth form shows an error and stays signed out when the session cookie cannot be written, instead of closing as though sign-in worked.
- Sign-out goes through `signOutUser()` / `useSignOut()` in `src/hooks/useSignOut.ts`. Do not call `signOut(auth)` elsewhere.
- `useAuthToken()` posts the ID token to that route before profile sync and refreshes it on interval/focus/visibility. Sign-out calls `DELETE /api/auth/session`.
- Signed-out visitors see Sign in and Create account in the header and mobile menu, linking to `/login` and `/signup`. The homepage keeps its sign-in modal. `next` is passed through `sanitizeInternalRedirectPath()` and defaults to `DEFAULT_SIGNED_IN_ROUTE` (`/tools`). Firebase auth failures are shown through `friendlyAuthError()` in `src/components/auth/authMessages.ts`, never as provider text.
- Links to protected routes that signed-out visitors can see use `ProtectedLink`. It keeps prefetch off until `useAuthStore.sessionReady` is true, which `persistIdTokenCookie()` sets. Without it, Next caches the proxy's redirect home from a signed-out prefetch and replays it on the first click after sign-in.
- Do not treat proxy access as authorization. A forged or expired cookie must still fail at the server action/API layer.

### Credits And Payments

Source files:

- `src/constants/credits.ts`
- `src/constants/creditPacks.ts`
- `src/actions/serverCredits.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/confirm/route.ts`
- `src/app/api/billing/webhook/route.ts`
- `src/actions/stripeFulfillment.ts`
- `src/actions/confirmIapPurchase.ts`
- `src/components/ui/CreditsPaywallModal.tsx`
- `src/components/CreditsLedger.tsx`

Invariants:

- Credit balances are non-negative integers.
- Credit debits and credits happen inside Firestore transactions.
- Ledger entries accompany credit mutations.
- Chargeable operations are idempotency-protected.
- Refunds use deterministic IDs where needed.
- Stripe confirmation validates auth, metadata UID, payment status, pack ID, USD currency, and amount before crediting. Checkout disables Adaptive Pricing.
- Stripe fulfillment uses a Firestore lock at `users/{uid}/locks/payment_{sessionId}` on the return page. The signed webhook at `POST /api/billing/webhook` grants the same way and claws credits back on `charge.refunded` and `charge.dispute.created`. Without `STRIPE_WEBHOOK_SECRET` the webhook returns 503 and grants nothing.
- Credit debits for chat, tools, and images share one transaction with the idempotency record (`debitCreditsIdempotent`).
- New profiles receive the 1000-credit starter balance only when the ID token's `email_verified` is true. Google counts when the token says so. An unverified account stays at 0 with a pending bootstrap claim and is paid once on a later verified sign-in. An existing profile with no claim is sealed and not paid again. The client `emailVerified` flag is not a grant.
- IAP fulfillment verifies HMAC signature over the payload including the store receipt, timestamp freshness, a catalog pack id with that pack's exact credit count, a store receipt whose `transaction_id` (not `original_transaction_id`) names that product, `receipt.bundle_id` equal to `APPLE_BUNDLE_ID`, and `app_item_id` when the receipt includes one, plus global transaction claim docs. A claim for the same user does not grant again. The signed credit amount is not a grant ceiling. A signature alone does not grant credits. `IAP_RECEIPT_VERIFY_URL` is ignored in production unless an emulator host is set.

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
  account/bootstrap

iapTransactions/{transactionId}
stripePaymentIntents/{paymentIntentId}
stripeClawbacks/{eventId}
```

`firestore.rules` and `storage.rules` are in the repo and are not deployed by the app. Deploy them separately. Clients may read only `users/{uid}/**`. Profile photo uploads are the only client Storage write (`users/{uid}/profile.png`, PNG, under 2 MB). Generated images are not client-readable; the app uses Admin signed URLs.

Profile strings from client writes are allowlisted and clamped in `profileContract.ts`, which `serverProfile.ts` uses. Credit balance and email are not client-writable. History strings are clamped in `serverHistory.ts`.

Account deletion calls `deleteAccountServer()` in `serverProfile.ts`. It recursively deletes `users/{uid}` (every subcollection, including `account/bootstrap`), deletes Storage under `users/{uid}/` and `generated/{uid}/`, removes `uid` from global `iapTransactions` claims (the claim stays so a receipt cannot be redeemed again), and deletes the Firebase Auth user last so a failed run can be retried. Global `stripePaymentIntents` and `stripeClawbacks` docs stay so a later refund is still idempotent. `verifyIdToken` checks revocation. `fetchProfileServer()` also calls `adminAuth.getUser()` before creating a profile so a deleted account's token cannot recreate it. `npm run prove:deletion` proves this on emulators. If you add a new per-user collection or Storage path, keep it under those prefixes or extend deletion.

### State Management

- `useAuthStore` tracks Firebase auth details and profile sync status.
- `useProfileStore` stores profile/credits and performs serialized optimistic profile updates with rollback.
- `usePaymentsStore` only reads payment history. Payment records are written only by Stripe confirmation and IAP fulfillment.
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
- rate-limited at 10 requests per minute (`proxy`); chat, image, tools, and proxy fail closed when the limiter cannot be read;
- HTTPS only;
- default port 443 only;
- no credentials in target URL;
- no IP literal hostnames;
- DNS-resolves target and connects directly to the verified public IP;
- blocks private/link-local/reserved IP ranges;
- rejects redirects;
- caps response body at 1 MB;
- times out at 8 seconds;
- returns the body as `text/plain` with `nosniff` and `content-disposition: attachment`.

Do not replace it with plain `fetch(targetUrl)` unless the same protections are rebuilt.

### Expo WebView Support

React Native WebView support is intentional:

- `window.ReactNativeWebView` detection lives in `src/utils/platform.ts` and `src/hooks/useClientSetup.ts`.
- Google popup sign-in is hidden in WebView.
- The Expo app does not sell credits. `useShowWebOnly()` (`src/hooks/useShowWebOnly.ts`) is false during SSR and in WebView; it gates every purchase surface (Account credit packs, paywall packs, header Top up, homepage Buy credits and Stripe mention) and Google sign-in. `/payment-attempt` never starts checkout in WebView. Out-of-credits toasts use `notEnoughCreditsMessage()`, which points app users to API keys.
- `confirmIapPurchase()` still verifies signed `IAP_SUCCESS` payloads if a native purchase flow imports it again; `productId` must be a credit pack id (`starter`, `plus`, `pro`, or `power`) and `credits` must equal that pack.
- Cookie consent is suppressed in WebView.
- Some localStorage coordination is skipped in WebView.
- The restricted-word guard is client-only and WebView-only. It is UX protection, not server moderation.

Do not remove WebView branches as dead code.

## Development Conventions

- Keep changes scoped to the requested behavior.
- Use existing constants, route maps, hooks, stores, UI primitives, Zod contracts, auth helpers, credit helpers, and idempotency helpers.
- Prefer structured parsers (Zod schemas in `src/utils/actionContracts.ts`) over ad hoc unknown-data handling.
- Keep security-sensitive refactors small and reviewable.
- Do not casually remove `package.json` overrides; they pin patched transitive versions.
- Do not modify generated files such as `.next/`, `tsconfig.tsbuildinfo`, Playwright trace output, or local test build artifacts.
- Do not read or print local secret files such as `.env`, `.env.local`, or `service_key.json`.

## TypeScript And Lint Expectations

- TypeScript is strict. Avoid `as` casts when a Zod schema or narrow type check fits.
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
- `src/app/api/billing/webhook/route.ts`
- `src/actions/stripeFulfillment.ts`
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

- `firebase.json` points at `firestore.rules`, `firestore.indexes.json`, and `storage.rules`. Do not deploy them from app release automation. No `vercel.json`, Dockerfile, cron config, or queue worker config is present.
- `.github/workflows/ci.yml` runs on pushes and pull requests to `dev` and `main` on Node 24 (AI SDK 7 and Firebase Admin 14 need Node 22 or later): `npm ci --ignore-scripts`, `npm run lint`, `npm run typecheck`, and `npm run build`, then installs Chromium and runs `npm run test:browser` headlessly. Build-time client values come from repository secrets listed in `docs/ci-secrets.md`. The Firebase client defers initialization when `NEXT_PUBLIC_FIREBASE_APIKEY` is empty, so the build succeeds without them.
- Deployment is currently inferred to be a standard Next.js deployment driven by `package.json`, `next.config.mjs`, environment variables, and the hosting platform configuration outside this repo.
- `public/.well-known/apple-app-site-association` and `public/.well-known/assetlinks.json` support native app/WebView association paths. Do not remove them as unused website assets.
- `next.config.mjs` allows Firebase/Google Storage image hosts and has `reactStrictMode: false`; re-enabling Strict Mode requires auditing auth/profile effects first.

## Failure Signals

- An aborted or failed credits-mode chat restores the debit. If that restore throws, the server logs `Chat refund failed`. The user sees a sanitized error.
- A rate-limit storage error logs `Rate limit check failed`. Chat, image, tools, and proxy fail closed. Other endpoints fail open so a Firestore hiccup does not become an outage.
- This repository has no paging service. The deployment owner reads those server logs.
- Stripe grants happen on the return page. The payment lock prevents a second grant for the same session. A missed return does not grant credits.

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

Billing/runtime:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` optional; webhook returns 503 and grants nothing until it is set
- `NEXT_PUBLIC_STRIPE_PRODUCT_NAME`
- `APP_URL`
- `NEXT_PUBLIC_COOKIE_NAME`
- `IAP_WEBVIEW_SECRET`
- `APPLE_BUNDLE_ID` required for IAP grants
- `APPLE_APP_ITEM_ID` required when production receipts include `app_item_id`
- `ALLOW_UNVERIFIED_SESSION_COOKIE` optional, local/CI only; ignored in production

`APPLE_IAP_SHARED_SECRET` is optional and is sent to Apple's verifyReceipt endpoint when `IAP_RECEIPT_VERIFY_URL` is unset. `IAP_RECEIPT_VERIFY_URL` is an optional local receipt verifier and is ignored when `NODE_ENV` is `production` unless `FIREBASE_AUTH_EMULATOR_HOST` or `FIRESTORE_EMULATOR_HOST` is set. Android grants stay closed unless that verifier is allowed.

The deployment owner owns configuration drift. When a new environment name is read in `src/`, update this list, `README.md`, and `.env.example` together.

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

- `/api/chat` is the active chat streaming path. (The legacy `useChatGeneration` hook has been removed.)
- `src/utils/messages.ts` exposes `getMessageText()` and `calculateWordCount()` (both used by the chat path). The previously unused `buildContextFromHistory()` and `truncateText()` helpers have been removed.
- `GenerationNextActions` exists for fresh text tool outputs, but expanded History cards currently expose repurpose actions only; "continue in chat" from History is still roadmap work.
- Rate-limit windows live in `src/utils/rateLimit.ts` and the idempotency TTL in `src/utils/idempotency.ts`; `src/constants/index.ts` holds only values that are read.
- Image generation uses fresh client request IDs like text generation, with a payload-hash fallback on the server action.
- Payment confirmation is return-page driven and also runs from the signed Stripe webhook when `STRIPE_WEBHOOK_SECRET` is set. Refunds and disputes claw credits back from that webhook.
- Firebase/GA4 measurement config exists, but there is no product analytics helper yet.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
