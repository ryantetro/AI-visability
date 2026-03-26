# Payment Flow Fixes + Upgrade Upsell Enhancements

## What it does

Fixes 4 bugs that broke the payment flow and adds 6 strategic upgrade upsell prompts throughout the app to convert free/lower-tier users to higher plans.

## Key files

| File | Role |
|------|------|
| `src/contexts/domain-context.tsx` | Fix 1: `?upgrade=` auto-checkout, Fix 3: `?fms=start` redirect, Fix 4: `?fms=success` banner |
| `src/app/api/webhooks/stripe/route.ts` | Fix 2: Growth price ID mappings in `priceIdToPlan()` |
| `src/app/advanced/panels/prompt-library-panel.tsx` | Upsell 1: Usage limit bar, Upsell 3: Rich empty state |
| `src/app/advanced/panels/ai-visibility-dashboard.tsx` | Upsell 2: Tier-contextual upgrade footer |
| `src/app/advanced/panels/ai-crawler-panel.tsx` | Upsell 4: Mid-tier upgrade text in empty state |
| `src/app/advanced/panels/ai-referral-panel.tsx` | Upsell 5: Mid-tier upgrade text in empty state |
| `src/app/advanced/settings/settings-section.tsx` | Upsell 6: Next-tier feature preview + upgrade CTA |
| `src/app/advanced/brand/brand-section.tsx` | Wiring: passes `tier`/`maxPrompts` to panels, uncomments PromptLibraryPanel |
| `src/app/advanced/dashboard/dashboard-section.tsx` | Wiring: passes `tier` to crawler/referral panels |

## How it works

### Payment Flow Fixes

1. **`?upgrade=` handler**: Pricing page links to `/dashboard?upgrade=starter_monthly`. A `useEffect` after `handleUnlockComplete` reads the param, strips it from the URL, and calls `handleUnlockComplete(plan)` to trigger the Stripe checkout redirect.

2. **Growth price IDs**: `priceIdToPlan()` in the Stripe webhook now maps `STRIPE_PRICE_GROWTH_MONTHLY` and `STRIPE_PRICE_GROWTH_ANNUAL` env vars to `growth_monthly`/`growth_annual`.

3. **`?fms=start` handler**: Detects the param in `domain-context.tsx`, strips it, and redirects to `/brand?tab=services`. The `brand-section.tsx` already reads `?tab=` from the URL.

4. **`?fms=success` handler**: Detects the param + `order_id`, strips both, and calls `setCheckoutBanner()` with a success message.

### Upsell Enhancements

- **Prompt Library usage bar**: Shows `{count}/{max} prompts used` with a progress bar. Turns amber at 80%, red at 100% with a tier-upgrade CTA.
- **Dashboard upgrade footer**: Non-growth users see a subtle dashed-border footer with tier-appropriate upgrade copy and button.
- **Prompt Library empty state**: Rich card with Sparkles icon, feature pitch, limit info, and next-tier nudge.
- **Crawler/Referral empty states**: Contextual upgrade text based on current tier.
- **Settings billing section**: Shows next-tier feature bullets and a priced upgrade CTA button.

## API contracts

No new API endpoints. All fixes reuse existing handlers:
- `POST /api/checkout` — triggered by `handleUnlockComplete(plan)`
- `POST /api/webhooks/stripe` — now correctly maps Growth prices

## Error handling

- All URL param effects strip the param immediately to prevent re-triggering on re-render
- `handleUnlockComplete` already handles checkout errors with `setActionError()`
- Upsell props are optional (`tier?: string`), so panels work unchanged if props aren't passed

## Configuration

- **New env vars needed for Growth**: `STRIPE_PRICE_GROWTH_MONTHLY`, `STRIPE_PRICE_GROWTH_ANNUAL`
- All tier limits come from `PLANS` in `src/lib/pricing.ts`
