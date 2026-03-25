# Pre-Launch Security Hardening

Summary of the P0 and P1 fixes applied to prepare AISO for real paying users.

## Key Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/007_increment_scans_rpc.sql` | Added `service_role` caller guard to `SECURITY DEFINER` RPC |
| `supabase/schema.sql` | Same RPC guard in consolidated schema |
| `src/lib/auth.ts` | Gated test-token backdoor behind `NODE_ENV === 'test'` |
| `src/middleware.ts` | Fixed `logBotVisit` URL ternary precedence, guarded empty `MONITORING_SECRET`, replaced `pathname.includes('.')` with explicit extension allowlist |
| `src/app/api/track/route.ts` | Added CORS headers and `OPTIONS` handler for cross-origin tracking scripts |
| `src/app/api/prompts/route.ts` | Added max-length validation on `promptText`, `domain`, `category`, `industry` |
| `src/app/api/prompts/[id]/route.ts` | Added UUID validation on `id` param, length caps on update fields |
| `src/lib/competitor-service.ts` | Added `userId` scoping to `getCompetitor` and `deleteCompetitor` (IDOR fix) |
| `src/app/api/competitors/[id]/route.ts` | Updated call sites to pass `userId` |
| `src/app/api/competitors/[id]/rescan/route.ts` | Updated call site to pass `userId` |
| `src/app/api/competitors/list/route.ts` | Added domain format and length validation |
| `src/app/api/crawler-visits/route.ts` | Added field length caps and `botCategory` allowlist |
| `src/lib/services/stripe-payment.ts` | `canUseStripe()` now requires both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; legacy `createCheckout` throws directing callers to `createSubscriptionCheckout` |
| `src/app/api/webhooks/stripe/route.ts` | Added event idempotency (in-memory Set), per-case try/catch with 500 on failure, 500 on missing user (triggers Stripe retry) |
| `src/app/api/checkout/verify/route.ts` | `upgradeUserPlan` only runs in mock mode; real Stripe mode is read-only (webhook owns upgrades) |
| `src/lib/services/registry.ts` | `USE_MOCKS=true` blocked in production |
| `src/lib/user-profile.ts` | Plan string validated against allowlist in `upgradeUserPlan` |
| `src/lib/services/mock-prompt-monitoring.ts` | Mock now respects `userId` in `listPrompts`, `updatePrompt`, `deletePrompt`, `listPromptResults` |
| `src/lib/services/mock-db.ts` | `findScanByUrl` returns newest match (not oldest), matching real DB behavior |

## P0 Fixes (Critical)

### 1. `increment_scans_used` RPC privilege escalation
The `SECURITY DEFINER` function had no caller check. Any authenticated Supabase user could call `rpc('increment_scans_used', { user_id: 'victim-id' })` and inflate another user's scan counter. Fixed by requiring `auth.role() = 'service_role'`.

### 2. `logBotVisit` URL construction + MONITORING_SECRET
The ternary precedence bug caused `NEXT_PUBLIC_APP_URL` to be ignored when set, constructing the URL from `VERCEL_URL` instead. Empty `MONITORING_SECRET` was sent as the header value. Fixed both: correct ternary grouping and early-return when secret is not configured.

### 3. Test auth backdoor in production
`_setTestAuth` / `_testTokens` were checked on every request before Supabase auth. Now gated behind `process.env.NODE_ENV === 'test'`.

## P1 Fixes (High)

### Security / API
- **CORS on `/api/track`**: Cross-origin tracking scripts can now POST successfully.
- **Input length caps**: All user-supplied strings validated before DB writes (prompts, competitors, crawler visits).
- **Competitor IDOR**: `getCompetitor` and `deleteCompetitor` now require and check `userId`.
- **Middleware static bypass**: Changed from `pathname.includes('.')` to explicit extension allowlist regex.

### Payments
- **`canUseStripe()` both keys**: Prevents checkout working but webhooks silently failing.
- **Webhook idempotency**: In-memory `Set` deduplicates events within a serverless instance lifetime.
- **Webhook error handling**: Each case wrapped in try/catch, returns 500 (Stripe retries) instead of silent 200.
- **Verify read-only in Stripe mode**: Webhook owns plan upgrades; verify only does scan unlock.
- **`USE_MOCKS` guard**: Blocked in production to prevent mock services replacing real Stripe.
- **Legacy `createCheckout` removed**: Throws with guidance to use `createSubscriptionCheckout`.
- **Plan string validation**: `upgradeUserPlan` rejects unknown plan strings.

### Data Integrity
- **Mock parity**: Mock prompt monitoring now enforces `userId` ownership; mock DB returns newest scan (matching real DB).

## Remaining P2 Items

These are documented in the audit but deferred to the next hardening sprint:
- Scan ownership by user ID instead of email
- Webhook grace period on subscription cancellation
- `invoice.payment_failed` handling (past_due users)
- TOCTOU race in `getOrCreateStripeCustomer`
- `planStringToTier` `startsWith` looseness
- Hardcoded email override audit trail
- Missing `(domain, detected_at)` index on `competitor_appearances`
- Mock reset functions for test isolation
- `listPromptResults` / `listResultsByPrompt` user-ownership scoping
- `ilike` pattern escaping in `findLatestScanByDomain`
