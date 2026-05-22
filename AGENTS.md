# AGENTS.md — Xref.ai Codebase Guide

## Project Overview

Xref.ai is an AI-powered writing, chat and image-generation app built on **Next.js 16 (App Router)**, **React 19**, **TypeScript** (strict), and **Tailwind CSS 4**. It supports multi-provider AI chat, writing tools, and image generation gated by a credit-based monetization system (Stripe Checkout on web, optional in-app purchases via signed IAP webview payloads).

## Quick Commands

```bash
npm run dev     # Start dev server (Next.js 16 defaults to Turbopack)
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint 10 (flat config)
```

No test framework is configured; ESLint is the primary code quality tool.

## Tech Stack

- **Framework:** Next.js 16.x (App Router, Turbopack default, Proxy replaces legacy middleware)
- **Language:** TypeScript 6.x (strict mode, `@/*` → `./src/*` path alias)
- **UI:** React 19.x, Tailwind CSS 4.x (via `@tailwindcss/postcss`), `@radix-ui/react-dialog`, `lucide-react`, `react-markdown` + `remark-gfm`, `react-hot-toast`
- **State:** Zustand 5.x (with `useShallow` for multi-field selectors)
- **Backend:** Firebase 12 client + `firebase-admin` 13 server (Firestore, Auth, Storage)
- **Payments:** Stripe 22.x (Checkout Sessions on web) + custom IAP confirmation for RN WebView
- **AI text:** Vercel AI SDK 6.x (`ai`, `@ai-sdk/react`, `@ai-sdk/rsc`) with OpenAI, Anthropic, xAI and Google providers
- **AI images:** Fireworks AI (`stable-diffusion-xl-1024-v1-0`)

## Directory Structure

```
src/
├── actions/        # "use server" Server Actions (AI, auth, credits, history, payments, profile)
├── ai/             # AI model whitelist (models.ts) + server factory (getTextModel.ts)
├── app/            # Next.js App Router pages & API routes
│   ├── api/        # billing/{checkout,confirm}, chat, proxy
│   ├── chat/ tools/ history/ account/ loginfinish/
│   └── payment-{attempt,success}/, about/, terms/, privacy/, support/
├── components/     # React UI (Chat, Home, History, Profile, Auth, etc.)
│   ├── DesignerPrompt/  # Design tool subcomponents
│   └── ui/         # Reusable primitives (Modal, Sheet, SubmitButton, CreditsPaywallModal…)
├── constants/      # index.ts, routes.ts, creditPacks.ts, credits.ts
├── data/           # Static choice lists (colors, candies, painters, etc.)
├── firebase/       # firebaseClient.ts (browser) + firebaseAdmin.ts (server, lazy Proxy)
├── hooks/          # useAuthToken, useChatGeneration, useImageGeneration, useFirestoreRealtime, …
├── types/          # Domain types + guards.ts runtime guards + globals.d.ts
├── utils/          # credits, errors, messages, idempotency, rateLimit, clipboard, …
├── zustand/        # useAuthStore, useProfileStore, usePaymentsStore, usePaywallStore, useInitializeStores
└── proxy.ts        # Next.js 16 edge proxy (soft cookie-presence gate on protected routes)
```

## Key Architecture Patterns

### Server vs Client Boundaries

- **Server Actions** (`src/actions/*.ts`, `"use server"`) — auth, credits, profile, history, payments, IAP confirmation, and the AI text-generation streamable (`generateAIResponse`).
- **API Routes** (`src/app/api/**/route.ts`, `runtime = "nodejs"`) — streaming chat (`/api/chat`), Stripe checkout/confirm, SSRF-safe URL proxy.
- **`"use client"`** components for interactive UI. Heavy client-only surfaces (auth, toasts, cookie consent) live under `ClientProvider`.
- **`src/proxy.ts`** is the Next.js 16 replacement for `middleware.ts`. It is a SOFT gate that only checks for the presence of the auth cookie; real token verification happens in every server action / API handler.

### Authentication Flow

1. `useAuthToken` subscribes to Firebase Auth via `react-firebase-hooks` and, when signed in, writes a fresh ID token to the `xrefAuthToken` cookie (name overridable via `NEXT_PUBLIC_COOKIE_NAME`).
2. Cookie write happens BEFORE profile sync so any immediate navigation to a protected route is covered by `proxy.ts`.
3. A token refresh is scheduled every `TOKEN_REFRESH_INTERVAL_MS` (50 min) and re-run on window focus / visibility change.
4. Server actions call `requireAuthedUid()` (`src/actions/serverAuth.ts`) — reads cookie, verifies via `adminAuth.verifyIdToken`, throws `AUTH_REQUIRED` on failure.
5. API route handlers call `requireAuthedUidFromRequest()` (`src/utils/requireAuthedRequest.ts`) which additionally accepts a `Bearer` token for RN WebView clients.
6. `useAuthStore.profileSyncStatus` (`idle | syncing | synced | error`) coordinates initial profile fetch in `useInitializeStores` with a `PROFILE_SYNC_TIMEOUT_MS` fallback.
7. On sign-out from a protected route, `ClientProvider` navigates the user home.

### Credit System

- Source of truth: `src/constants/credits.ts`
  - `CREDITS_COSTS.chatMessage = 25`, `imageGeneration = 300`, `tagSuggestion = 25`, `minTextGeneration = 25`
  - `getTextGenerationCreditsCost(wordCount)` — `max(25, ceil(wordCount * 0.5))`
- Credit packs: `src/constants/creditPacks.ts` — `starter | plus | pro | power`, with `amountCents` → `credits` mapping used by both UI and `/api/billing/*`.
- Mutations go through **Firestore transactions** in `src/actions/serverCredits.ts`:
  - `debitCreditsOrThrow(uid, amount, meta)` — debit + ledger entry, throws `INSUFFICIENT_CREDITS`.
  - `creditCredits(uid, amount, meta?)` — credit + ledger entry (supports `deterministicId` for refund idempotency).
  - `getCredits(uid)` — current balance.
- Every debit is gated by an **idempotency check** and followed by a refund + `markIdempotencyFailed` if the downstream operation errors or aborts.
- `src/utils/credits.ts` provides client/server-shared helpers: `coerceCredits`, `isValidDebitAmount`, `calculateNewBalance` (throws `INSUFFICIENT_CREDITS` on negative), `formatCredits`.

### Idempotency (`src/utils/idempotency.ts`)

- Keys are per-user and stored at `users/{uid}/idempotency/{key}` with a TTL (`IDEMPOTENCY_TTL_MS`, 24h).
- `generateClientIdempotencyKey(uid, clientKey)` is preferred: the client calls `createClientIdempotencyKey()` (`src/utils/clientIdempotencyKey.ts`, `crypto.randomUUID`) and sends it with each submit so genuine retries are collapsed but intentional re-submits are distinct.
- `generateIdempotencyKey(uid, payload)` is a fallback that hashes the payload. It intentionally does NOT use a time window (previous implementation allowed double-charge on window boundaries).
- `checkAndSetIdempotency` atomically marks a key `processing`; `markIdempotencyComplete` and `markIdempotencyFailed` close the lifecycle.

### Rate Limiting (`src/utils/rateLimit.ts`)

- Distributed fixed-window counters stored at `users/{uid}/rateLimit/{endpoint}` via Firestore transactions — a single `windowStart` + `count` per endpoint (no unbounded arrays).
- Defaults: `chat` 60/min, `image` 10/min, `tools` 30/min, `default` 100/min (all 60s windows).
- `rateLimitMiddleware(uid, endpoint)` returns `null` when allowed or a 429 `Response` with `Retry-After`, `X-RateLimit-*` headers when blocked.
- **Fails open** on Firestore errors to avoid turning infra hiccups into outages.
- `cleanupRateLimitData(uid)` removes stale docs; safe to run periodically.

### Payments

- **Web (Stripe Checkout):**
  - `POST /api/billing/checkout` — verifies auth, looks up `packId` in `CREDIT_PACKS`, creates a Checkout Session, returns the hosted URL.
  - `POST /api/billing/confirm` — verifies auth, acquires a **distributed lock** at `users/{uid}/locks/payment_{sessionId}` (TTL `PAYMENT_LOCK_TTL_MS` = 30s), retrieves the session, verifies `metadata.uid`, `payment_status === "paid"`, and `amount_total === pack.amountCents`, then atomically writes payment + profile credits + ledger (all with deterministic doc IDs so retries are no-ops).
- **IAP (RN WebView):** `src/actions/confirmIapPurchase.ts`
  - Verifies an HMAC-SHA256 signature over a JSON-canonicalized payload (shared secret `IAP_WEBVIEW_SECRET`).
  - Rejects replays via 5-minute timestamp skew window.
  - Enforces a global claim doc at `iapTransactions/{transactionId}` so a transaction can be consumed by exactly one uid.
  - Caps credits at `2 × max(CREDIT_PACKS.credits)`.

### SSRF-Safe URL Proxy (`/api/proxy`)

- Auth + rate-limit gated.
- HTTPS only, port 443 only, no credentials in URL, no hostname IP literals.
- DNS-resolves the hostname and connects to the verified public IP directly (closes the TOCTOU window Node's `fetch` leaves open).
- Blocks private/loopback/link-local IPv4 CIDRs and IPv6 ranges.
- Rejects redirects (301/302/303/307/308) so an allowed host can't hop to a blocked one.
- Caps response body at 1 MB and enforces an 8s timeout.

### State Management (Zustand)

| Store                 | File                    | Purpose                                                                                 |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `useAuthStore`        | `useAuthStore.ts`       | Firebase auth state + `profileSyncStatus` + `syncAuthProfile`                           |
| `useProfileStore`     | `useProfileStore.ts`    | Profile + credits with **optimistic updates and serialized rollback** via write queue   |
| `usePaymentsStore`    | `usePaymentsStore.ts`   | Payment history (fetch/add/check by id)                                                 |
| `usePaywallStore`     | `usePaywallStore.ts`    | Credits paywall modal (context persists on close to avoid flicker)                      |
| `useInitializeStores` | `useInitializeStores.ts`| Hook that resets stores on uid change and fetches profile once sync status resolves     |

Patterns:
- **`useShallow`** for multi-field selectors (`useChatGeneration`, `useImageGeneration`, etc.) to prevent unnecessary re-renders and race conditions.
- **Refs instead of state** in callback dependencies where a realtime listener shouldn't re-subscribe on UI flag changes (`useChatMessages`, `useFirestoreRealtime`).
- Optimistic profile writes are serialized through a module-level `profileUpdateQueue` so rollbacks don't clobber unrelated in-flight edits.

### AI Model Support

- Whitelist in `src/ai/models.ts`:
  - `openai:gpt-5.4` (default)
  - `anthropic:Codex-sonnet-4-6`
  - `xai:grok-4`
  - `google:gemini-3-pro-preview`
- `resolveAiModelKey(value)` falls back to the default if the key isn't whitelisted — used both when persisting profile updates and when building the model for a generation.
- `getTextModel({ modelKey, useCredits, ...apiKeys })` in `src/ai/getTextModel.ts`:
  - **Credits mode** (`useCredits !== false`): uses server env keys via the default provider clients.
  - **User keys mode** (`useCredits === false`): uses the user-supplied key from profile (e.g. `openai_api_key`) via `createOpenAI({apiKey})` / `createAnthropic` / `createXai` / `createGoogleGenerativeAI`.
- Image generation uses Fireworks AI directly in `src/actions/generateImage.ts` (not the AI SDK).

## Key Files

| File                                | Purpose                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `src/actions/generateAIResponse.ts` | Unified AI text generation (simple + conversation) with credit/idempotency   |
| `src/actions/generateImage.ts`      | Fireworks image generation with credit/idempotency + Storage upload          |
| `src/actions/serverAuth.ts`         | `requireAuthedUid()` — verifies Firebase ID token from cookie                |
| `src/actions/serverCredits.ts`      | Transactional debit/credit with ledger entries                               |
| `src/actions/serverProfile.ts`      | Profile read/write with sanitized whitelist and model-key validation         |
| `src/actions/serverHistory.ts`      | Writes `summaries` and `chats` subcollections with size clamps               |
| `src/actions/serverPayments.ts`     | Payments collection reads/writes, duplicate guard                            |
| `src/actions/confirmIapPurchase.ts` | HMAC-verified IAP credit application with global claim doc                   |
| `src/app/api/chat/route.ts`         | Streaming chat endpoint (rate limit + idempotent debit + refund on failure) |
| `src/app/api/billing/checkout/route.ts` | Stripe Checkout Session creation                                         |
| `src/app/api/billing/confirm/route.ts`  | Post-checkout crediting with distributed lock                            |
| `src/app/api/proxy/route.ts`        | SSRF-safe HTTPS proxy for website scraping                                   |
| `src/proxy.ts`                      | Edge proxy; soft cookie gate for protected routes                            |
| `src/hooks/useAuthToken.ts`         | Firebase auth → cookie + profile sync + token refresh                        |
| `src/hooks/useChatGeneration.ts`    | Chat submit/stream/save flow                                                 |
| `src/hooks/useFirestoreRealtime.ts` | Live first-page subscription + older-page pagination                         |
| `src/zustand/useProfileStore.ts`    | Profile + credits, serialized optimistic updates + rollback                  |
| `src/zustand/useAuthStore.ts`       | Auth state + `profileSyncStatus`                                             |
| `src/utils/idempotency.ts`          | Firestore-backed idempotency (generate/check/complete/fail/cleanup)          |
| `src/utils/rateLimit.ts`            | Fixed-window rate limiter with fail-open safety                              |
| `src/utils/credits.ts`              | Shared credit coercion / balance math                                        |
| `src/utils/messages.ts`             | AI-SDK message text extraction + word count + context trimming               |
| `src/utils/errors.ts`               | Custom error classes + type guards + paywall handler                         |
| `src/types/guards.ts`               | Runtime type guards (`isObject`, `hasProperty`, `safeString`, …)             |
| `src/constants/index.ts`            | Centralized numeric/string constants (limits, TTLs, rate-limits, messages)   |
| `src/firebase/firebaseAdmin.ts`     | Lazy Admin SDK singleton via Proxy (safe at build time)                      |
| `src/firebase/firebaseClient.ts`    | Firebase web SDK init (auth/firestore/storage)                               |

## API Routes

| Route                   | Method | Purpose                                                                                |
| ----------------------- | ------ | -------------------------------------------------------------------------------------- |
| `/api/chat`             | POST   | Streaming chat (25 credits / message, rate-limited, idempotent, refunds on abort)      |
| `/api/billing/checkout` | POST   | Create Stripe Checkout Session for a `packId` from `CREDIT_PACKS`                      |
| `/api/billing/confirm`  | POST   | Verify `session_id`, credit profile, write payment + ledger under distributed lock     |
| `/api/proxy`            | GET    | SSRF-safe HTTPS-only scraper (auth required, rate-limited, 1 MB cap, 8 s timeout)      |

Chat endpoint error codes: `401` (`AUTH_REQUIRED`), `402` (`INSUFFICIENT_CREDITS`), `409` (`DUPLICATE_CHAT_REQUEST` / `CHAT_REQUEST_IN_PROGRESS`), `429` (rate-limited), `500` fallback.

## Pages (App Router)

Public: `/`, `/about`, `/privacy`, `/terms`, `/support`, `/loginfinish`.
Protected (via `proxy.ts` matcher): `/chat`, `/tools`, `/history`, `/account`, `/payment-attempt`, `/payment-success`.

Root layout (`src/app/layout.tsx`) loads the Plus Jakarta Sans variable font and wraps children in `<ClientProvider>`, which owns auth, toasts, cookie consent and the paywall modal.

## Firestore Data Model

```
users/{uid}/
  profile/userData          # User profile (credits, API keys, preferences, selected model)
  chats/{autoId}             # Chat messages ({ prompt, response, timestamp })
  summaries/{autoId}         # Tool outputs ({ prompt, response, topic, words, xrefs?, derivedFromId?, tool? })
  payments/{docId}           # Stripe + IAP payments (docId: `checkout_{sessionId}` | `iap_{transactionId}`)
  creditsLedger/{docId}      # Ledger entries (debit/credit with reason/tool/modelKey/refId/balanceAfter)
  idempotency/{key}          # 24h-TTL idempotency records
  rateLimit/{endpoint}       # { windowStart, count } per endpoint
  locks/payment_{sessionId}  # Distributed lock for /api/billing/confirm

iapTransactions/{transactionId}  # Global single-claim guard for IAP receipts
```

Server-side writes clamp string sizes (`serverHistory.ts`: 20k prompt, 50k response, 20 xrefs × 2k; `serverProfile.ts`: 4k per field).

## Shared Utilities

### Credits (`src/utils/credits.ts`)

```ts
coerceCredits(value, fallback);         // Non-negative finite integer, always
isValidDebitAmount(amount);
isValidCreditAmount(amount);
calculateNewBalance(current, delta);    // Throws INSUFFICIENT_CREDITS / "not finite"
formatCredits(credits);                 // "1,000 credits"
```

### Messages (`src/utils/messages.ts`)

```ts
getMessageText(message);                // Handles AI SDK `parts` or legacy `content`
calculateWordCount(text);
truncateText(text, max, notice?);
buildContextFromHistory(history, maxWords);
```

### Errors (`src/utils/errors.ts`)

```ts
class InsufficientCreditsError extends Error
class AuthRequiredError extends Error
class RateLimitError extends Error      // with retryAfterMs
isInsufficientCreditsError(error)
isAuthRequiredError(error)
isRateLimitError(error)
getErrorMessage(error, fallback?)
handleInsufficientCredits(openPaywall, context)
handleOperationError(operation, error, showToast?)
```

### Type Guards (`src/types/guards.ts`)

```ts
isObject / isString / isNumber / isBoolean / isArray
hasProperty / hasStringProperty / hasNumberProperty
isTimestampLike
safeString / safeNumber / safeBoolean
createStringLiteralGuard(values)
assert / assertDefined
```

### Platform / Content Guard (`src/utils/platform.ts`, `contentGuard.ts`)

- `isReactNativeWebView()` — detects `window.ReactNativeWebView` (used to suppress cookie-consent banner and localStorage writes).
- `checkRestrictedWords(content)` — UX-only restricted-word filter, applied client-side for iOS WebView (NOT enforced server-side — document in code that broader moderation would need a server move).

### Clipboard / Images (`src/utils/clipboard.ts`, `resizeImage.ts`, `getImagePrompt.ts`)

- `copyToClipboard`, `copyImageToClipboard`, `downloadImage` (with secure-context fallback).
- `resizeImage(file)` — center-crops to 1024×1024 PNG Blob.
- `getImagePrompt(promptData, topic)` — composes an image prompt from `src/data/*` choice lists.

## Coding Conventions

### TypeScript

- `strict: true`, `target: ES2017`, `moduleResolution: bundler`, `@/*` alias.
- Prefer type guards from `src/types/guards.ts` over `as` casts when handling `unknown` data from Firestore or APIs.
- Defensive credit handling via `coerceCredits` + `calculateNewBalance` — never trust raw Firestore numbers.

### Components

- Functional components with hooks only (no classes except `ErrorBoundary`).
- Custom hooks prefixed with `use`.
- Components in PascalCase; file name matches the default export.
- Use `useShallow` for multi-field Zustand selectors.
- Use `useRef` to hold latest callbacks/state in realtime listeners so subscriptions don't churn.

### Security Patterns

- ID token verification on every mutation (`requireAuthedUid` / `requireAuthedUidFromRequest`).
- Firestore transactions for all credit/payment/idempotency/rate-limit reads-modify-writes.
- **Idempotency keys** prevent duplicate charges on retries.
- **Distributed locks** prevent double-processing of the same Stripe session.
- **Rate limiting** prevents API abuse (per-user, per-endpoint).
- **Stack traces hidden in production** by `ErrorBoundary`; only an error ID is shown.
- URL proxy is SSRF-hardened (DNS-verified IP, redirect rejection, byte cap, timeout).
- IAP confirmations require HMAC signature + fresh timestamp + global claim doc.
- Profile writes sanitized against a fixed `CLIENT_WRITABLE_FIELDS` allowlist with per-type validation; text fields clamped to 4k chars.

### Error Handling

- Toast notifications via `react-hot-toast` (`Toaster` mounted in `ClientProvider`).
- `handleOperationError(operation, error, showToast)` centralizes logging + toast, and suppresses toasts for known handled error classes.
- `ErrorBoundary` wraps the app; in production it shows a generated `ERR-<timestamp>` reference instead of a stack.

## Constants Reference (`src/constants/index.ts`)

| Constant                          | Value     | Purpose                                              |
| --------------------------------- | --------- | ---------------------------------------------------- |
| `MAX_WORDS_IN_CONTEXT`            | 5000      | Chat context window word budget                      |
| `MAX_CHAT_LOAD`                   | 30        | Chat page size                                       |
| `MAX_HISTORY_LOAD`                | 20        | History page size                                    |
| `MIN_WORD_COUNT` / `MAX_WORD_COUNT` / `DEFAULT_WORD_COUNT` | 3 / 800 / 30 | Tool word-count bounds            |
| `COPY_FEEDBACK_DURATION`          | 2000 ms   | Copy toast duration                                  |
| `MAX_STREAMED_CHARS`              | 12000     | Max chars before streamed response is truncated      |
| `TRUNCATION_NOTICE`               | `"\n\n[Response truncated due to length]"` | Appended on truncation |
| `STREAMING_THROTTLE_MS`           | 100 ms    | Client-side stream throttle                          |
| `STREAMING_UPDATE_INTERVAL_MS`    | 120 ms    | Min interval between streamed UI updates             |
| `MAX_MARKDOWN_CHARS` / `_LINES` / `_MARKERS` | 8000 / 400 / 300 | Markdown render guardrails                  |
| `MAX_VISIBLE_CHATS`               | 80        | Max chats rendered at once                           |
| `TOKEN_REFRESH_INTERVAL_MS`       | 50 min    | Firebase ID token refresh cadence                    |
| `PROFILE_SYNC_TIMEOUT_MS`         | 5000 ms   | Max wait before fetching profile anyway              |
| `RATE_LIMIT_WINDOW_MS`            | 60 000    | Default window                                       |
| `CHAT_RATE_LIMIT` / `IMAGE_RATE_LIMIT` / `TOOLS_RATE_LIMIT` | 60 / 10 / 30 | Per-window request caps                 |
| `IDEMPOTENCY_TTL_MS`              | 24 h      | Idempotency record lifetime                          |
| `IDEMPOTENCY_TIME_WINDOW_MS`      | 60 000    | (Legacy constant — fallback key generator is windowless by design) |
| `PAYMENT_LOCK_TTL_MS`             | 30 000    | Distributed lock duration for `/api/billing/confirm` |

## Environment Variables

### Firebase server (Admin SDK)

`FIREBASE_TYPE`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_CLIENT_ID`, `FIREBASE_AUTH_URI`, `FIREBASE_TOKEN_URI`, `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`, `FIREBASE_CLIENT_CERTS_URL`, `FIREBASE_UNIVERSE_DOMAIN`

(`\n` escapes in `FIREBASE_PRIVATE_KEY` are converted to real newlines on load.)

### Firebase client

`NEXT_PUBLIC_FIREBASE_APIKEY`, `NEXT_PUBLIC_FIREBASE_AUTHDOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECTID`, `NEXT_PUBLIC_FIREBASE_STORAGEBUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID`, `NEXT_PUBLIC_FIREBASE_APPID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENTID`

### AI providers (server, credits mode)

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `FIREWORKS_API_KEY`
(Optionally `OPENAI_ORG_ID`.)

### Stripe / billing

`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_KEY` (publishable), `NEXT_PUBLIC_STRIPE_PRODUCT_NAME`, `APP_URL` (canonical origin used to build Checkout redirects; falls back to request origin in dev).

### Misc

`NEXT_PUBLIC_COOKIE_NAME` (defaults to `xrefAuthToken`), `NEXT_PUBLIC_CREDITS_PER_IMAGE`, `IAP_WEBVIEW_SECRET` (required for RN WebView IAP flow).

## ESLint Config Notes

`eslint.config.mjs` is a flat config that intentionally does **not** use `eslint-config-next` (incompatible with ESLint 10). It composes:

- `@eslint/js` recommended
- `typescript-eslint` recommended
- `@next/eslint-plugin-next` (`recommended` + `core-web-vitals`)
- `eslint-plugin-react-hooks` v7 — only the two classic rules (`rules-of-hooks` error, `exhaustive-deps` warn) because this project does **not** use React Compiler and the new compiler rules generate false positives on standard SSR patterns.

## Important Notes

1. `reactStrictMode: false` in `next.config.mjs` — don't re-enable without auditing the auth/profile sync effects.
2. Turbopack is the default dev bundler in Next.js 16 (no `--turbopack` flag needed).
3. Chat streaming is throttled at ~120 ms in the hook, independent of the 100 ms markdown render throttle.
4. Page-level auth is **cookie presence only** at the edge; every mutation re-verifies the token server-side.
5. Idempotency protects every chargeable operation and is complemented by refund-on-failure across chat, image, and text generation paths.
6. Rate limiting is distributed (Firestore) and fails open.
7. ErrorBoundary hides stack traces in production and surfaces a reference ID instead.
8. Optimistic profile writes are serialized via a module-level queue so rollback on failure restores the exact prior client state.
9. Firebase Admin is lazy-initialized through Proxy objects so build-time prerender doesn't crash when credentials are absent.
10. SSRF protection in `/api/proxy` connects directly to the DNS-resolved public IP — do not refactor to plain `fetch()` without re-adding host verification.
