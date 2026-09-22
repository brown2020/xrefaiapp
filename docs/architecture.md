# Xref.ai architecture

## Surfaces
- Next.js 16 App Router (`src/app`) for pages and route handlers
- Server actions under `src/actions` for mutations (credits, history, profile, payments, generation)
- Firebase Auth + Firestore + Storage (client deferred when `NEXT_PUBLIC_FIREBASE_APIKEY` is empty)
- Stripe Checkout + native IAP confirmation for credits
- Edge `src/proxy.ts` soft-gates protected routes via auth cookie presence only

## Authority
| Fact | Writer | Store | Cache / revalidation |
| --- | --- | --- | --- |
| Auth session cookie | client `useAuthToken` + `/api/auth/session` | HTTP cookie `xrefAuthToken` | browser; proxy reads presence only |
| Profile / credits | server actions (`serverProfile`, `serverCredits`, billing routes) | Firestore `users/{uid}` | client zustand stores refreshed after mutations |
| Generation history | `serverHistory` / generate actions | Firestore history collections | client history queries |
| Payments | Stripe webhook / IAP confirm actions | Firestore payments + credits ledger | account UI reload |

## Trust boundary
- Browser never authorizes spend or generation; server actions and route handlers verify Firebase ID tokens via Admin SDK.
- `proxy.ts` is not authorization — only a soft cookie gate.
- Provider API keys stay server-side unless the user explicitly stores their own keys on the profile for BYOK mode.
