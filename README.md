# Xref.ai (xrefaiapp)

An AI creation workspace for chat, writing tools, website/text summaries, image prompts, image generation, saved history, and credit-based (or bring-your-own-key) usage. Built for creators, marketers, students, and researchers who want a usable first draft quickly and a place to return to saved work.

**Live demo:** [https://xref.ai](https://xref.ai)

Deeper docs for agents and product direction live in [AGENTS.md](./AGENTS.md) and [spec.md](./spec.md).

## Features

- **Homepage** — starter paths (Creator / Marketer / Student / Researcher) that deep-link into Chat or Tools with prefills
- **Firebase Auth** — Google popup, email/password, password reset, email-link (`/loginfinish`); cookie `xrefAuthToken` (name overridable); soft route gating via `src/proxy.ts`
- **Streaming chat** (`/chat`) — Vercel AI SDK transport; recent history as context; credit debit / refund / rate limits / idempotency; saves under `users/{uid}/chats`
- **Tools** (`/tools`) — Summarize Website (via SSRF-hardened `/api/proxy`), Summarize Text, Freestyle Writing, Simplify Writing, Generate Image (OpenAI `gpt-image-2`), Designer Prompt builder
- **History** (`/history`) — search, pagination, expand, copy/download, markdown, text repurpose actions, per-item delete, and Clear all
- **Account** (`/account`) — credits, ledger, Stripe credit packs, payment history, API-key mode + model selection, account deletion. The 1,000 starter credits are granted only after the ID token says the email is verified (Google counts when the token says so). An unverified account stays at 0 and is told to verify; the grant happens once on the next verified sign-in.
- **Payments** — Stripe Checkout (`/api/billing/checkout` + `/confirm`); Expo/WebView IAP confirmation with HMAC + optional Apple receipt verify
- **Public pages** — `/about`, `/privacy`, `/terms`, `/support`
- **Models (credits / user keys)** — OpenAI `gpt-5.4`, Anthropic `claude-sonnet-4-6`, xAI `grok-4.7`, Google `gemini-3.1-pro-preview`

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js `^16.4.2` (App Router + `src/proxy.ts`) |
| UI | React `^19.3.1`, Tailwind CSS `^4.3`, Radix dialog, Lucide, Plus Jakarta Sans, react-hot-toast, react-markdown |
| Language | TypeScript `^6` (held until typescript-eslint supports TypeScript 7) |
| Auth / data | Firebase `^13` + Firebase Admin `^14` (Auth, Firestore, Storage) |
| AI text | Vercel AI SDK (`ai` `^7`, `@ai-sdk/openai|anthropic|google|xai|rsc|react`) |
| AI images | OpenAI `gpt-image-2` via AI SDK `generateImage` in a server action |
| Payments | Stripe `^23` Checkout; native IAP helpers for WebView |
| State | Zustand `^5` |
| Validation | Zod `^4` |
| Tests | Playwright `^1.60` |
| Lint | ESLint `^10` + typescript-eslint |

## Project structure

```
src/
  app/                 # Routes + API (chat, billing, auth session, proxy)
  actions/             # Server actions: AI, credits, history, payments, IAP, auth
  ai/                  # Model whitelist + getTextModel factory
  components/          # Chat, tools, history, account, auth, public layout
  firebase/            # Client + Admin init (emulator-aware)
  zustand/ hooks/ utils/ constants/ types/ data/
  proxy.ts             # Soft cookie gate for protected paths
tests/                 # Playwright specs
scripts/               # Architecture / workflow proof scripts
docs/                  # architecture, CI secrets, budget notes
.env.example
.github/workflows/ci.yml
.github/workflows/malware-scan.yml
```

### Notable routes

| Area | Paths |
| --- | --- |
| Public | `/`, `/about`, `/login`, `/signup`, `/loginfinish`, `/privacy`, `/terms`, `/support` |
| App | `/chat`, `/tools`, `/history`, `/account`, `/payment-attempt`, `/payment-success` |
| API | `/api/chat`, `/api/billing/checkout`, `/api/billing/confirm`, `/api/auth/session`, `/api/proxy` |

## Getting started

### Prerequisites

- Node.js 22+
- npm
- Firebase project (Auth, Firestore, Storage)
- Stripe account (for credit purchases)
- At least one text-model provider key for credits mode; `OPENAI_API_KEY` also powers image generation
- Optional: Apple IAP shared secret / verify URL for native purchases

### Clone and install

```bash
git clone https://github.com/brown2020/xrefaiapp.git
cd xrefaiapp
npm install
```

### Environment variables

Copy `.env.example` to `.env.local`. **Never commit real keys.**

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_APIKEY` | Firebase web API key | Firebase Console → Project settings |
| `NEXT_PUBLIC_FIREBASE_AUTHDOMAIN` | Auth domain | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_PROJECTID` | Project id | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_STORAGEBUCKET` | Storage bucket | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID` | Messaging sender id | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_APPID` | Web app id | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENTID` | Optional Analytics id | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | Optional Auth emulator host | Local emulator only |
| `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` | Optional Firestore emulator host | Local emulator only |
| `FIREBASE_TYPE` | Service account type (`service_account`) | Service account JSON |
| `FIREBASE_PROJECT_ID` | Admin project id | Service account JSON |
| `FIREBASE_PRIVATE_KEY_ID` | Admin private key id | Service account JSON |
| `FIREBASE_PRIVATE_KEY` | Admin private key (PEM; escape newlines) | Service account JSON |
| `FIREBASE_CLIENT_EMAIL` | Admin client email | Service account JSON |
| `FIREBASE_CLIENT_ID` | Admin client id | Service account JSON |
| `FIREBASE_AUTH_URI` | Google OAuth auth URI | Service account JSON |
| `FIREBASE_TOKEN_URI` | Google token URI | Service account JSON |
| `FIREBASE_AUTH_PROVIDER_X509_CERT_URL` | Certs URL | Service account JSON |
| `FIREBASE_CLIENT_CERTS_URL` | Client certs URL | Service account JSON |
| `FIREBASE_UNIVERSE_DOMAIN` | Present in service account JSON; not read by the app | Optional |
| `OPENAI_API_KEY` | Credits-mode OpenAI | [OpenAI](https://platform.openai.com/) |
| `OPENAI_ORG_ID` | Optional OpenAI org | OpenAI dashboard |
| `ANTHROPIC_API_KEY` | Credits-mode Anthropic | [Anthropic](https://console.anthropic.com/) |
| `XAI_API_KEY` | Credits-mode xAI / Grok | [xAI](https://console.x.ai/) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Credits-mode Gemini | [Google AI Studio](https://aistudio.google.com/) |
| `NEXT_PUBLIC_COOKIE_NAME` | Auth cookie name (default `xrefAuthToken`) | Your choice |
| `NEXT_PUBLIC_STRIPE_PRODUCT_NAME` | Product label for Checkout | Stripe / your naming |
| `STRIPE_SECRET_KEY` | Stripe secret for Checkout + confirm | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Optional signing secret for `POST /api/billing/webhook`. Unset: the route returns 503 and grants nothing. Return-page confirm still works. | Stripe Dashboard webhook endpoint |
| `APP_URL` | Canonical app origin for Checkout redirects | e.g. `http://localhost:3000` or production URL |
| `IAP_WEBVIEW_SECRET` | HMAC secret for Expo WebView IAP messages | Generate a strong secret |
| `APPLE_IAP_SHARED_SECRET` | Apple verifyReceipt shared secret | App Store Connect |
| `APPLE_BUNDLE_ID` | Required for any IAP grant. Receipts must match this bundle id. Unset: IAP returns not configured and grants nothing. | App Store Connect |
| `APPLE_APP_ITEM_ID` | Required when a production receipt includes `app_item_id`. Sandbox receipts that omit it still match. | App Store Connect |
| `IAP_RECEIPT_VERIFY_URL` | Optional local/test receipt verify endpoint. Ignored when `NODE_ENV` is `production` unless `FIREBASE_AUTH_EMULATOR_HOST` or `FIRESTORE_EMULATOR_HOST` is set. | Local only / your verifier |
| `ALLOW_UNVERIFIED_SESSION_COOKIE` | Local/CI stand-in when Admin creds absent. Ignored when `NODE_ENV` is `production`. | **Never in production** |

See `docs/ci-secrets.md` for which `NEXT_PUBLIC_*` values CI expects as GitHub Actions secrets.

### Firebase setup

1. Enable Google, Email/Password, and Email link providers as needed.
2. Configure Firestore collections used by profile, credits ledger, chats, history, and payments (see AGENTS.md / spec for shapes).
3. Deploy `firestore.rules`, `firestore.indexes.json`, and `storage.rules` (see `firebase.json`). Generated images are written by the Admin SDK; the only client Storage write is `users/{uid}/profile.png`. Apply `cors.json` to the Storage bucket separately (`gsutil cors set`).
4. Map a service account into the `FIREBASE_*` Admin variables.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Playwright reliability suite (`tests/code-reliability.spec.ts`) without webServer |
| `npm run test:browser` | Full Playwright suite |
| `npm run doctor` | React Doctor full scan (pinned `react-doctor@0.9.14`) |
| `npm run prove:workflows` | Critical workflows against Firebase emulators and a local model fixture (needs `firebase-tools` and Java; no paid calls) |
| `npm run prove:deletion` | Account deletion removes every Firestore document, Storage file, and Auth record for the user (Auth, Firestore, and Storage emulators; run `npm run build` first) |
| `npm run prove:state` | Signed-in account switch and credits badge against the ledger, in headless Chromium on the emulators |

## Testing and CI

CI (`.github/workflows/ci.yml`) on `dev` / `main` and PRs:

1. `npm ci --ignore-scripts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build` with Firebase/Stripe `NEXT_PUBLIC_*` from `${{ secrets.* }}`
5. `npm run test:browser` in headless Chromium against that build

A separate `malware-scan.yml` workflow exists for dependency/malware scanning. Playwright specs under `tests/` cover activation paths, auth entry, route protection, writing controls, and code reliability.

## Deployment

Production site: [xref.ai](https://xref.ai) (typically Vercel). Configure the full server env (Firebase Admin, Stripe, provider keys, IAP secrets) in the host. Keep `ALLOW_UNVERIFIED_SESSION_COOKIE` unset in production. Set `STRIPE_WEBHOOK_SECRET` when the Stripe webhook endpoint is live; until then checkout still grants on the return page. Set `APPLE_BUNDLE_ID` before any IAP grant.

## Contributing

1. Develop on `dev` and follow invariants in `AGENTS.md`.
2. Run lint and typecheck before pushing; use Playwright for UI-sensitive flows.
3. Never commit `.env.local`, service account JSON, or real secrets.

## License

[GNU Affero General Public License v3.0](LICENSE.md) (AGPL-3.0).
