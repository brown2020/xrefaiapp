# CLAUDE.md - Xref.ai Codebase Guide

## Project Overview

Xref.ai is an AI-powered writing and chat application built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS 4. It provides multi-model AI chat, writing tools, and image generation with a credit-based monetization system.

## Quick Commands

```bash
npm run dev     # Start development server (Turbopack)
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint
```

## Tech Stack

- **Framework:** Next.js 16.x with App Router & Turbopack
- **Language:** TypeScript 5.x (strict mode)
- **UI:** React 19.x, Tailwind CSS 4.x
- **State:** Zustand 5.x with shallow equality selectors
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Payments:** Stripe
- **AI:** Vercel AI SDK with OpenAI, Anthropic, xAI, Google providers
- **Images:** Fireworks AI

## Directory Structure

```
src/
├── actions/          # Server Actions (AI generation, payments, auth)
├── app/              # Next.js App Router pages & API routes
│   └── api/          # API routes (chat, billing, proxy)
├── components/       # React components
│   └── ui/           # Reusable UI components
├── hooks/            # Custom React hooks
├── zustand/          # Zustand state stores
├── firebase/         # Firebase client & admin config
├── ai/               # AI model definitions & factories
├── types/            # TypeScript type definitions & guards
├── constants/        # App constants (routes, credits, streaming, limits)
├── utils/            # Utility functions (credits, messages, errors, idempotency, rateLimit)
├── data/             # Static data files
└── proxy.ts          # Edge-level route protection
```

## Key Architecture Patterns

### Server vs Client Boundaries
- Server Actions in `src/actions/` for backend operations
- API Routes in `src/app/api/` for streaming and webhooks
- `"use client"` pragma marks client components
- `proxy.ts` handles edge-level route protection

### Authentication Flow
1. Firebase Auth (email/password + Google OAuth)
2. Token stored in cookie via `getAuthCookieName()`
3. Server verifies via `requireAuthedUid()` in `serverAuth.ts`
4. Protected routes: `/chat`, `/tools`, `/history`, `/account`
5. Profile sync status tracked to prevent race conditions

### Credit System
- All AI operations debit credits via `debitCreditsOrThrow()`
- **Idempotency protection** prevents double-charging on retries
- Uses Firestore transactions for atomic operations
- Ledger entries created for every transaction
- Credit packs defined in `src/constants/creditPacks.ts`
- **Optimistic updates with rollback** on profile changes

### Rate Limiting
- API endpoints protected with distributed rate limiting
- Chat: 60 requests/minute per user
- Image: 10 requests/minute per user
- Returns 429 with `Retry-After` header when exceeded

### State Management (Zustand)
- `useAuthStore` - Authentication state (uid, email, authReady, **profileSyncStatus**)
- `useProfileStore` - User profile & credits with **optimistic update rollback**
- `usePaywallStore` - Credits paywall modal
- `usePaymentsStore` - Payment history
- **Use `useShallow`** for multi-field selectors to prevent race conditions

### AI Model Support
- Models defined in `src/ai/models.ts`
- Factory in `src/ai/getTextModel.ts`
- Supports "credits mode" (server keys) and "user keys mode"
- Models: OpenAI GPT-5.2, Anthropic Claude, xAI Grok, Google Gemini

## Key Files

| File | Purpose |
|------|---------|
| `src/actions/generateAIResponse.ts` | Unified AI text generation |
| `src/actions/serverAuth.ts` | Server-side auth verification |
| `src/actions/serverCredits.ts` | Credit debit/credit operations |
| `src/app/api/chat/route.ts` | Streaming chat endpoint with idempotency & rate limiting |
| `src/zustand/useProfileStore.ts` | Profile state with optimistic rollback |
| `src/zustand/useAuthStore.ts` | Auth state with profileSyncStatus |
| `src/utils/idempotency.ts` | Idempotency key generation & checking |
| `src/utils/rateLimit.ts` | Distributed rate limiting |
| `src/utils/credits.ts` | Shared credit utilities |
| `src/utils/messages.ts` | Message text extraction utilities |
| `src/utils/errors.ts` | Unified error handling |
| `src/types/guards.ts` | Runtime type guards |
| `src/constants/index.ts` | Centralized constants |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Streaming chat (25 credits/msg, rate limited, idempotent) |
| `/api/billing/checkout` | POST | Create Stripe checkout session |
| `/api/billing/confirm` | POST | Confirm payment & add credits (with distributed lock) |
| `/api/proxy` | GET | Web scraping proxy for URL summarization |

## Firestore Data Model

```
users/{uid}/
  profile/userData      # User profile (credits, API keys, preferences)
  chats/{docId}         # Chat message history
  summaries/{docId}     # Text generation history
  payments/{docId}      # Stripe payment records
  creditsLedger/{docId} # Credit transaction audit trail
  idempotency/{key}     # Idempotency records (24h TTL)
  rateLimit/{endpoint}  # Rate limit counters
  locks/{lockId}        # Distributed locks for payments
```

## Shared Utilities

### Credits (`src/utils/credits.ts`)
```typescript
coerceCredits(value, fallback)  // Safe credit value coercion
isValidDebitAmount(amount)      // Validate debit amounts
calculateNewBalance(current, delta)  // Calculate with validation
formatCredits(credits)          // Display formatting
```

### Messages (`src/utils/messages.ts`)
```typescript
getMessageText(message)         // Extract text from AI messages
calculateWordCount(text)        // Count words
truncateText(text, max, notice) // Truncate with notice
buildContextFromHistory(history, maxWords)  // Build context window
```

### Errors (`src/utils/errors.ts`)
```typescript
isInsufficientCreditsError(error)  // Type guard for credits errors
isAuthRequiredError(error)         // Type guard for auth errors
isRateLimitError(error)            // Type guard for rate limit errors
handleInsufficientCredits(openPaywall, context)  // Handle with paywall
getErrorMessage(error, fallback)   // Safe error message extraction
```

### Type Guards (`src/types/guards.ts`)
```typescript
isObject(value)        // Check if non-null object
hasProperty(obj, key)  // Check property exists
safeString(value)      // Safe string extraction
safeNumber(value)      // Safe number extraction
assertDefined(value)   // Assert non-null/undefined
```

## Coding Conventions

### TypeScript
- Strict mode enabled, exhaustive type definitions
- Path alias: `@/*` maps to `./src/*`
- Use type guards from `src/types/guards.ts` for runtime safety
- Defensive type coercion via `src/utils/credits.ts`

### Components
- Functional components with hooks only
- Custom hooks prefixed with `use`
- Components in PascalCase, files match export name
- Use `useShallow` for multi-field Zustand selectors

### State Management Best Practices
- **Single memoized selectors** for related fields (prevents race conditions)
- **Optimistic updates with rollback** for better UX
- **Profile sync status tracking** to coordinate auth/profile initialization
- **Refs for callback dependencies** to prevent listener recreation

### Security Patterns
- Token verification via Firebase Admin SDK
- Firestore transactions for atomic credit operations
- **Idempotency keys** prevent duplicate charges on retries
- **Distributed locks** prevent payment double-processing
- **Rate limiting** prevents API abuse
- **Error stack traces hidden** in production
- Content moderation via `checkRestrictedWords()`
- Stripe validation for payment integrity

### Error Handling
- Toast notifications via `react-hot-toast`
- Use type guards from `src/utils/errors.ts`
- Unified error handling with `handleOperationError()`
- Production ErrorBoundary hides stack traces

## Constants Reference

All configurable values are centralized in `src/constants/index.ts`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_STREAMED_CHARS` | 12000 | Max chars before truncation |
| `STREAMING_THROTTLE_MS` | 100 | UI update throttle |
| `MAX_VISIBLE_CHATS` | 80 | Chat display limit |
| `TOKEN_REFRESH_INTERVAL_MS` | 50 min | Auth token refresh |
| `CHAT_RATE_LIMIT` | 60/min | Chat endpoint limit |
| `IMAGE_RATE_LIMIT` | 10/min | Image endpoint limit |
| `IDEMPOTENCY_TTL_MS` | 24 hours | Idempotency key TTL |
| `PAYMENT_LOCK_TTL_MS` | 30 sec | Payment lock duration |

## Environment Variables

Required server-side variables:
- Firebase Admin credentials
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `FIREWORKS_API_KEY`
- `APP_URL` (production domain)

Client-side (`NEXT_PUBLIC_*`):
- Firebase client config
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Important Notes

1. **No test framework** - ESLint is the primary code quality tool (Vitest setup recommended)
2. **reactStrictMode: false** in next.config.mjs
3. **Turbopack** enabled for faster dev builds
4. **100ms throttle** on chat streaming for performance
5. **Scroll-to-bottom** behavior in chat interface
6. **Idempotency** protects all credit operations from retry issues
7. **Rate limiting** protects API endpoints from abuse
8. **Error boundaries** hide stack traces in production
9. **Optimistic updates** with rollback for better UX
10. **Profile sync coordination** prevents auth/profile race conditions
