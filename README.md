# Xref.ai

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase)](https://firebase.google.com/)

Xref.ai is an AI creation workspace for writing, chat, summarization, image prompts, image generation, saved history, and flexible credit-based usage. It is built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Firebase, Stripe Checkout, Fireworks AI, and the Vercel AI SDK.

## Documentation Map

- [AGENTS.md](./AGENTS.md): the single complete implementation guide for coding agents. Use it for architecture, invariants, security boundaries, platform constraints, and verification expectations.
- [spec.md](./spec.md): the current product spec and roadmap. Use it for product behavior, user promises, current capabilities, constraints, and ordered roadmap milestones.
- [CLAUDE.md](./CLAUDE.md): pointer-only entry point that redirects agents to `AGENTS.md`.

## Current Product

Xref.ai currently includes:

- Homepage with sign-in CTA, feature overview, responsive hero, and stable mobile typewriter.
- Firebase authentication with Google, email/password, password reset, and email-link sign-in.
- AI chat with streaming responses, recent-history context, persistence, rate limiting, credit debits, idempotency, and refund-on-failure behavior.
- Tools for website summary, text summary, freestyle writing, simplification, image generation, and structured design prompt generation.
- History with search, pagination, expandable cards, markdown rendering, image copy/download, and text repurposing actions.
- Account area with credits, credit packs, Stripe checkout, payment history, credits ledger, API key mode, model selection, and account deletion.
- Public `/about`, `/terms`, `/privacy`, and `/support` pages using a shared public-page layout.
- Expo / React Native WebView support, including native IAP messaging and native-specific browser feature suppression.

## Tech Stack

- Next.js 16 App Router with `src/proxy.ts` for soft protected-route gating.
- React 19 and TypeScript 6 in strict mode.
- Tailwind CSS 4 via `@tailwindcss/postcss`.
- Firebase client SDK and Firebase Admin for Auth, Firestore, and Storage.
- Zustand for client state.
- Vercel AI SDK 6 for text/chat generation.
- Fireworks AI for image generation.
- Stripe 22 Checkout Sessions for web credit purchases.
- HMAC-signed native IAP confirmation for the Expo WebView app.

## Quick Start

Install dependencies:

```bash
npm install
```

Create `.env.local` with the required Firebase, AI provider, Stripe, and optional native IAP variables.

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev     # Start the Next.js dev server
npm run build   # Production build
npm run start   # Start the production server
npm run lint    # Run ESLint
npm run test:browser # Run headless Playwright smoke tests
```

`npm run lint`, `npm run build`, and the Playwright smoke suite are the baseline verification commands. Browser verification is expected for visible UI changes.

## Environment Variables

### Firebase Client

```env
NEXT_PUBLIC_FIREBASE_APIKEY=
NEXT_PUBLIC_FIREBASE_AUTHDOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECTID=
NEXT_PUBLIC_FIREBASE_STORAGEBUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID=
NEXT_PUBLIC_FIREBASE_APPID=
NEXT_PUBLIC_FIREBASE_MEASUREMENTID=
```

### Firebase Admin

```env
FIREBASE_TYPE=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=
FIREBASE_TOKEN_URI=
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=
FIREBASE_CLIENT_CERTS_URL=
```

`.env.example` also contains `FIREBASE_UNIVERSE_DOMAIN`; the active Firebase Admin initialization does not currently read it.

### AI Providers

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
XAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
FIREWORKS_API_KEY=
```

`OPENAI_ORG_ID` is optional.

### Billing and App Runtime

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PRODUCT_NAME=
APP_URL=
NEXT_PUBLIC_COOKIE_NAME=
IAP_WEBVIEW_SECRET=
```

`NEXT_PUBLIC_COOKIE_NAME` defaults to `xrefAuthToken`. `IAP_WEBVIEW_SECRET` is required only for the native WebView IAP flow. Legacy samples may mention `NEXT_PUBLIC_STRIPE_KEY` and `NEXT_PUBLIC_CREDITS_PER_IMAGE`, but active checkout and credit pricing do not currently read them.

## Routes

Public routes:

- `/`
- `/about`
- `/privacy`
- `/terms`
- `/support`
- `/loginfinish`

Protected routes:

- `/chat`
- `/tools`
- `/history`
- `/account`
- `/payment-attempt`
- `/payment-success`

API routes:

- `POST /api/chat`
- `POST /api/billing/checkout`
- `POST /api/billing/confirm`
- `GET /api/proxy`

## Project Structure

```text
src/
├── actions/        # Server actions for AI, auth, credits, history, payments, profile
├── ai/             # AI model whitelist and provider factory
├── app/            # App Router pages and API routes
├── components/     # React UI and feature surfaces
├── constants/      # Routes, credit packs, credit costs, shared limits
├── data/           # Static choice lists for design/image prompts
├── firebase/       # Firebase client and lazy Admin SDK singletons
├── hooks/          # Auth, chat, generation, Firestore, scraper, setup hooks
├── types/          # Domain types and runtime guards
├── utils/          # Credits, errors, idempotency, rate limit, clipboard, proxy helpers
├── zustand/        # Client stores
└── proxy.ts        # Next.js edge proxy for soft protected-route gating
```

## Core Invariants

- Auth cookie presence gates protected routes, but every mutation verifies the Firebase ID token server-side.
- Credit debits happen server-side, transactionally, with ledger entries.
- Chargeable generation is idempotency-protected.
- Failed or aborted downstream generation attempts refund credits when a debit occurred.
- Stripe fulfillment validates authenticated user, metadata, payment status, and amount before crediting.
- Native IAP fulfillment requires HMAC signature, timestamp freshness, credit caps, and global transaction claim guards.
- `/api/proxy` must remain SSRF-hardened.
- Expo WebView branches are intentional and should not be removed as dead code.

## More Detail

For implementation details, read [AGENTS.md](./AGENTS.md).

For current product behavior and roadmap priorities, read [spec.md](./spec.md).
