# Monetization Roadmap (Credits-First) — Xref.ai

## Context / quick audit (what’s already working)

- **Strong “bones”**: Chat + Tools + History + Account pages are implemented and reasonably polished (`src/components/Chat.tsx`, `src/components/Tools.tsx`, `src/components/History.tsx`, `src/components/Profile.tsx`).
- **Payments exist**: Stripe PaymentIntent + PaymentElement checkout (`src/actions/paymentActions.ts`, `src/app/payment-attempt/page.tsx`, `src/components/PaymentCheckoutPage.tsx`, `src/components/PaymentSuccessPage.tsx`).
- **Payment fulfillment is now server-side + idempotent**: credits are minted in a server transaction tied to the authenticated Firebase user (not on the client). (`src/actions/paymentActions.ts` → `fulfillStripePaymentIntent(...)`)
- **Credits exist (and are persisted)**: credits live in Firestore `users/{uid}/profile/userData` and are shown in Account (`src/zustand/useProfileStore.ts`, `src/components/ProfileComponent.tsx`).
- **BYO API keys mode exists**: users can opt out of credits and use their own provider keys (`profile.useCredits`, `src/ai/getTextModel.ts`, `src/components/ProfileComponent.tsx`).

## Highest-impact finding (revenue blocker)

**Credits are enforced in the UI, but not enforced server-side (bypass risk).**

- Client/UI paths **do** reserve credits (`minusCredits`) and refund on failures in chat/tools/images (`src/components/BasePrompt.tsx`, `src/hooks/useChatGeneration.ts`, `src/components/ImagePrompt.tsx`, `src/hooks/useImageGeneration.ts`).
- However, the server actions (`generateAIResponse`, `generateImage`, `suggestTags`) do **not** verify credit balance or debit credits on the server. A determined user can bypass the UI and call these paths without spending credits.
- Tag suggestion is especially weak: it trusts a **client-provided `credits` number** and does **no debit on success** (`src/actions/suggestTags.ts`).

If generation can be triggered without a server-side debit, you won’t get a reliable credit-to-revenue loop (and you’ll have preventable abuse/cost).

---

## North Star + key metrics (what to optimize for)

- **North Star**: _Paid credits purchased per activated user (7-day)_.
- **Activation**: user generates **1+ successful outputs** (chat/tool/image) within first session.
- **Monetization**:
  - Checkout started → checkout completed conversion rate
  - Credits depleted → purchase conversion rate
  - Average order value (AOV)
  - Repeat purchase rate (30/60/90 days)
- **Unit economics**:
  - Credits consumed per output (by tool + model)
  - Margin proxy: provider cost per output vs credit price

---

## Pricing/credits model (recommended)

### Use a simple, visible credit economy

Recommended mapping: **$1.00 ≈ 100 credits** (so $99.99 → 10,000 credits). That implies:

- **$1.00 ≈ 100 credits**
- **1 credit ≈ $0.01**

This is good: it’s easy to communicate and reason about.

### Set “cost per action” first (MVP), then evolve to token-based

Start with **fixed costs per action** to avoid complicated token accounting:

- **Chat message**: 10–30 credits (depending on model tier)
- **Tool generation (short)**: 25 credits
- **Tool generation (long / high word count)**: 50–150 credits (based on requested word count slider)
- **Image generation**: 200–500 credits (depending on SDXL settings)

Then, once analytics exist, move to **token-based** charging for text (more fair + protects margins).

---

## Roadmap

### Track A — Monetization plumbing (credits/payments) (must-have, but not the product)

#### 0.0 Lock down credit integrity (security + correctness)

- ✅ **Move Stripe credit fulfillment server-side + idempotent** (done)
  - Prevents “replay” and “someone else’s PaymentIntent” credit minting.
  - Implementation: `src/actions/paymentActions.ts` → `fulfillStripePaymentIntent(...)` writes:
    - `users/{uid}/payments/{paymentIntentId}`
    - increments `users/{uid}/profile/userData.credits` transactionally
- ✅ **Close free-credits exploit via `window.postMessage`** (done)
  - Only accept `IAP_SUCCESS` messages inside the RN WebView context.
  - Implementation: `src/components/ProfileComponent.tsx`
- ✅ **Harden credit charging API** (done)
  - `minusCredits(NaN|<=0)` no longer “succeeds”.
  - Implementation: `src/zustand/useProfileStore.ts`

#### 0.1 Enforce credits at every generation boundary

- **Goal**: every “generate” action must either:
  - decrement credits (credits mode), OR
  - require user API keys (BYO mode), OR
  - block + show paywall UX.

**Implementation touches**

- Client/UI reserve+refund (already implemented):
  - Text tools: `src/components/BasePrompt.tsx`
  - Chat: `src/hooks/useChatGeneration.ts`
  - Images: `src/components/ImagePrompt.tsx` and `src/hooks/useImageGeneration.ts`
- Server-side enforcement (still needed):
  - Text: `src/actions/generateAIResponse.ts`
  - Images: `src/actions/generateImage.ts`
  - Tags: `src/actions/suggestTags.ts`
- Credit source of truth: `src/zustand/useProfileStore.ts` (`minusCredits`, `addCredits`)

**Recommended approach**

- Add a small “credits service” (server-side) that:
  - computes the **expected cost** for an action (`getCreditsCost(...)`)
  - verifies auth (Firebase ID token cookie)
  - checks user balance and debits atomically (transaction / `increment(-cost)`)
  - writes an auditable ledger entry (see 0.2)

> Rule: **clients can request generation, but only the server can decide whether credits are spent**.

**Acceptance criteria**

- When balance is insufficient, generation does not run and user sees a clear CTA to buy credits.
- Credits decrement is reflected immediately in UI and persisted to Firestore.
- Direct calls to server actions cannot bypass debiting (no “free generations”).

#### 0.2 Add a credit ledger (auditable + trust-building)

- **Why**: users trust spending more when they can see where credits went.

**Implementation touches**

- New Firestore collection: `users/{uid}/creditsLedger/{entryId}`
  - `{ type: "debit" | "credit", amount, reason, tool, modelKey, createdAt, refId }`
- Show it in Account under payments (`src/components/Profile.tsx` / `src/components/ProfileComponent.tsx`)

**Acceptance criteria**

- Every purchase creates a ledger credit entry.
- Every generation creates a ledger debit entry.

---

### Track B — Product features (what users actually pay for)

> Goal: make the app feel like a **workflow tool** (repeatable outcomes), not a single-output demo.

#### 1.0 Repurpose actions from History (1 click → useful deliverables)

From a history item, add “repurpose” buttons such as:

- “Turn into Twitter thread”
- “Turn into LinkedIn post”
- “Turn into email to a client”
- “Generate 5 hooks”
- “SEO title + meta”

**Why it’s valuable**

- Turns a single output into a _set of finished assets_ users can ship.
- Creates a strong repeat loop (more actions → more wins → more retention).

**Implementation touches**

- `src/components/History.tsx`: add an action row per history item (shown when expanded).
- Add reusable prompt templates (constants) and reuse existing text generation action.
- Save repurposed outputs back into History as new items linked to the original.

**Acceptance criteria**

- Any history item can be repurposed with 1 click.
- User sees streamed output + can save it.
- History shows a parent/child relationship (simple “Derived from …” label is enough v1).

---

#### 1.1 Projects / Workspaces (organize + collaborate later)

Allow users to group outputs by project (client, brand, class, campaign).

- Project entity: `users/{uid}/projects/{projectId}`
- History items optionally link to `projectId`

**Why it’s valuable**

- Makes outputs feel like “work in progress” rather than disposable.
- Users return because their work is organized in-app.

---

#### 1.2 Saved prompts + reusable templates (high leverage)

- Let users save prompt templates and run them repeatedly.
- Add “variables” (e.g., `{product}`, `{audience}`, `{tone}`).

**Premium hooks**

- Some templates are “Pro” (higher cost) and clearly labeled.

---

### Track C — Conversion UX (helps monetization, but supports product)

#### 1.1 In-context paywall modal (not a dead-end error)

When credits are low/insufficient, show a modal that answers:

- **Why blocked**: “This action costs 50 credits; you have 12.”
- **What you get**: pack options + bonuses
- **Fast path**: “Buy credits” (primary) + “Use my API keys” (secondary)

**Implementation touches**

- Add `src/components/ui/CreditsPaywallModal.tsx` (Radix/Dialog via existing UI patterns)
- Trigger from:
  - `BasePrompt`, `useChatGeneration`, `ImagePrompt` / `useImageGeneration`

#### 1.2 Add real pricing packs (not just $99.99)

Currently checkout is hard-coded to `$99.99` and “Buy 10,000 Credits”.

**Change**

- Offer 3–5 packs (with psychological pricing + bonus credits):
  - Starter: $10 → 1,100 credits
  - Plus: $25 → 2,900 credits
  - Pro: $50 → 6,000 credits
  - Power: $100 → 13,000 credits (best value)

**Implementation touches**

- `src/app/payment-attempt/page.tsx`: take `pack` via query string; compute amount dynamically.
- `src/components/ProfileComponent.tsx`: replace single “Buy 10,000 Credits” with pack selector + CTA.
- `src/components/Home.tsx`: pricing teaser should deep-link to Account with a preselected pack.

#### 1.3 Add “low credits” surfacing everywhere

- Header should show a small credit pill + “Top up” CTA when below threshold.

**Implementation touches**

- `src/components/Header.tsx` (read from `useProfileStore` and render a pill/CTA)

#### 1.4 Improve “value proof” before purchase

Add “before/after” and “use-case templates” that demonstrate outcomes users pay for:

- Blog post outline → full post
- Notes → email
- Website → summary + action plan

**Implementation touches**

- `src/components/Chat.tsx`: expand the “Try this” examples into template chips grouped by persona.
- `src/components/Tools.tsx`: show “recommended next tool” after each successful output.

---

### Phase 2 (2–4 weeks): Product loops that drive repeat usage + referrals

#### 2.1 Projects / Workspaces (retain + organize)

Allow users to group outputs by project (client, brand, class, campaign).

- Project entity: `users/{uid}/projects/{projectId}`
- Summaries link to projectId

**Why it sells credits**

- More organized work → more repeated usage → more depletion → more top-ups.

#### 2.2 Saved prompts + reusable templates (high leverage)

- Let users save prompt templates and run them repeatedly.
- Add “variables” (e.g., `{product}`, `{audience}`, `{tone}`).

**Premium hooks**

- Some templates are “Pro” (higher credit cost) and clearly labeled.

#### 2.3 “Repurpose” actions from History (one click → more spend)

From a history item, add buttons:

- “Turn into Twitter thread”
- “Turn into LinkedIn post”
- “Generate 5 hooks”
- “SEO title + meta”

**Implementation touches**

- `src/components/History.tsx`: add action row per item (only when expanded).

---

### Phase 3 (1–2 months): Pricing sophistication + margin safety

#### 3.1 Token-based charging (text) + model tiering

Once you have analytics, move to:

- charge based on `prompt tokens + completion tokens` (or rough proxy like word count output)
- charge more for “premium” models (and make that explicit in UI)

**Implementation touches**

- Central “cost calculator” shared by chat/tools
- Store: `profile.text_model` is already persisted and whitelisted (`src/ai/models.ts`, `src/ai/getTextModel.ts`)

#### 3.2 Auto-recharge (big revenue unlock)

- User sets a minimum balance (e.g., 500 credits).
- When they go below, automatically charge a saved payment method.

This requires shifting from PaymentIntent-only to a Stripe customer + saved PM flow.

---

### Phase 4 (2–3 months): Growth channels that monetize

#### 4.1 Referral program (credits-based)

- “Give 500 credits, get 500 credits after first purchase”
- Referrals tracked per user; fraud controls via “first paid purchase” condition.

#### 4.2 Team / shared credits (B2B-lite)

- A small team plan where credits are shared across seats.

---

## Operational / engineering checklist (to make revenue stable)

- **Analytics**: instrument events:
  - `generation_started`, `generation_succeeded`, `paywall_shown`, `checkout_started`, `checkout_succeeded`, `credits_debited`
- **Abuse controls**:
  - per-user rate limits (especially for image gen)
  - minimum credits to start image gen
- **Trust**:
  - show credit costs before user clicks “Generate”
  - provide ledger + receipts
- **Payments/credits correctness**:
  - keep fulfillment idempotent and server-owned (no client-side credit minting)
  - prefer Stripe webhooks for fulfillment (event-driven) over return-url flows long-term

---

## Suggested implementation order (most ROI → least)

1. **Enforce and deduct credits everywhere** (Phase 0.1) + add ledger (Phase 0.2)
2. **Replace single $99.99 pack with 3–5 packs** (Phase 1.2)
3. **Paywall modal + low-credit surfacing in header** (Phase 1.1 + 1.3)
4. **Repurpose-from-history actions** (Phase 2.3)
5. **Projects + templates** (Phase 2.1 + 2.2)
6. **Token-based pricing + auto-recharge** (Phase 3)
