# Pricing Restructure & Feature Implementation Plan

## Status: Phases 1-8 COMPLETE

Started: 2026-03-25
Phases 1-6 completed: 2026-03-25
Phase 7 (Team seats): Completed 2026-03-26
Phase 8 (Fix My Site): Completed 2026-03-26

See [18-pricing-restructure-implementation.md](./18-pricing-restructure-implementation.md) for implementation details.

---

## 1. Overview

Restructure AISO from 3 tiers (Free/$29/$79) to 4 tiers (Free/$49/$99/$249) based on competitive analysis of Cognizo ($149/$499), Otterly ($29/$189/$489), Profound ($99/$399), and Peec (~$97/~$217). Add missing features: platform selection gating, AI-optimized page generator, data export, prompt volume analytics, region/language targeting, team seats, and a "Fix My Site" service add-on.

---

## 2. New Pricing Tiers

| | Free | Starter | Pro | Growth |
|---|---|---|---|---|
| **Monthly** | $0 | $49/mo | $99/mo | $249/mo |
| **Annual** | $0 | $39/mo ($468/yr) | $79/mo ($948/yr) | $199/mo ($2,388/yr) |
| **Domains** | 1 | 1 | 3 | 10 |
| **Prompts tracked** | 5 | 25 | 75 | 200 |
| **Platforms** | 2 | 2 | 4 | All (6) |
| **Monitoring** | None | Weekly | Daily | Daily |
| **AI-optimized pages** | 0 | 0 | 2/mo | 5/mo |
| **Competitors** | 0 | 0 | 3 | 10 |
| **AI crawler analytics** | No | Basic (totals) | Full (timeline + trends) | Full + CSV export |
| **AI referral tracking** | No | Yes | Yes | Yes + CSV export |
| **Data export (CSV)** | No | No | Yes | Yes |
| **Seats** | 1 | 1 | 3 | Unlimited |
| **Region/language** | 1 region | 1 region | 3 regions | Unlimited |
| **Support** | Email | Email | Email | Email + onboarding call |
| **Score badge** | Yes | Yes | Yes | White-label |
| **API access** | No | No | No | Yes (future) |

### Add-on Service
- **"Fix My Site" package**: $499 one-time — we optimize robots.txt, llms.txt, structured data, sitemap, and other AI visibility files for the customer

---

## 3. Implementation Phases

### Phase 1: Pricing Core (Priority: CRITICAL)
Update the pricing engine, Stripe products, and UI to reflect the new 4-tier model.

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.1 | Add `growth` to `PlanTier` type, update `PLANS` config | `src/lib/pricing.ts` | Small |
| 1.2 | Update `TIER_LEVEL`, `canAccess()`, `planStringToTier()` | `src/lib/pricing.ts` | Small |
| 1.3 | Update `PaymentPlanString` type and `getPlanPriceCents()` | `src/lib/pricing.ts` | Small |
| 1.4 | Update `FEATURE_GATES` with new gates and tier assignments | `src/lib/pricing.ts` | Medium |
| 1.5 | Update `NAV_GATES` for new tier | `src/lib/pricing.ts` | Small |
| 1.6 | Update `AccessInfo` to include new limits (platforms, regions, seats, competitors) | `src/lib/access.ts` | Medium |
| 1.7 | Update `VALID_PLANS` set in `upgradeUserPlan()` | `src/lib/user-profile.ts` | Small |
| 1.8 | Update `UserUsage` interface with new fields | `src/lib/user-profile.ts` | Small |
| 1.9 | Add Stripe price env vars for growth tier | `src/lib/services/stripe-payment.ts` | Small |
| 1.10 | Update `PricingSection` component for 4-card layout | `src/components/pricing/pricing-section.tsx` | Medium |
| 1.11 | Update FAQ content for new tiers | `src/components/pricing/pricing-section.tsx` | Small |
| 1.12 | Update `/api/auth/me` response to include new access fields | `src/app/api/auth/me/route.ts` | Small |
| 1.13 | Update `usePlan()` hook to expose new fields | `src/hooks/use-plan.ts` | Small |

### Phase 2: Platform Selection Gating (Priority: HIGH)
Gate which AI engines users can track based on their tier.

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.1 | Define platform allowance per tier in `PLANS` config | `src/lib/pricing.ts` | Small |
| 2.2 | Add `maxPlatforms` to `AccessInfo` | `src/lib/access.ts` | Small |
| 2.3 | Define platform priority order (ChatGPT > Perplexity > Gemini > Claude > Copilot > Grok) | `src/lib/pricing.ts` | Small |
| 2.4 | Add platform selection UI to onboarding/settings | `src/app/settings/` (new component) | Medium |
| 2.5 | Store selected platforms per domain in DB | New migration + `monitoring_domains` or new table | Medium |
| 2.6 | Enforce platform limit in scan API | `src/app/api/scan/route.ts` | Small |
| 2.7 | Enforce platform limit in prompt monitoring | `src/app/api/cron/monitor/route.ts` | Small |
| 2.8 | Show upgrade prompt when user tries to add more platforms than allowed | UI components | Small |

### Phase 3: Data Export (Priority: HIGH)
Add CSV/JSON export for scan results, prompt data, and analytics.

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.1 | Create export utility (`generateCSV()`, `generateJSON()`) | `src/lib/export.ts` (new) | Small |
| 3.2 | Add `GET /api/export/scans` route (Pro+) | New API route | Medium |
| 3.3 | Add `GET /api/export/prompts` route (Pro+) | New API route | Medium |
| 3.4 | Add `GET /api/export/crawler-visits` route (Growth) | New API route | Medium |
| 3.5 | Add `GET /api/export/referral-visits` route (Growth) | New API route | Medium |
| 3.6 | Add export buttons to dashboard, prompts, and analytics panels | UI components | Small |
| 3.7 | Gate export behind `data_export` feature flag | `src/lib/pricing.ts` | Small |

### Phase 4: Prompt Volume Analytics UI (Priority: MEDIUM)
Dedicated view showing prompt search volume trends and insights.

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.1 | Create `GET /api/prompts/volume` aggregation endpoint | New API route | Medium |
| 4.2 | Build PromptVolumePanel component (chart + table) | New component | Medium |
| 4.3 | Add to dashboard or advanced page | Existing page | Small |
| 4.4 | Gate behind `prompt_metrics` feature flag (starter+) | Already exists | None |

### Phase 5: Region & Language Targeting (Priority: MEDIUM)
Allow users to specify regions/languages for prompt tracking.

| # | Task | Files | Effort |
|---|------|-------|--------|
| 5.1 | Define supported regions list (US, UK, CA, AU, EU, etc.) | `src/lib/regions.ts` (new) | Small |
| 5.2 | Add `region` column to `monitored_prompts` table | New migration | Small |
| 5.3 | Add `maxRegions` to plan config and `AccessInfo` | `src/lib/pricing.ts`, `src/lib/access.ts` | Small |
| 5.4 | Update prompt creation API to accept region parameter | `src/app/api/prompts/route.ts` | Small |
| 5.5 | Update prompt monitoring cron to pass region to AI engine calls | `src/app/api/cron/monitor/route.ts` | Medium |
| 5.6 | Add region selector UI to prompt creation form | UI component | Medium |
| 5.7 | Show region badge on prompt results | UI component | Small |
| 5.8 | Store user's selected regions per domain | DB or settings | Small |

### Phase 6: AI-Optimized Page Generator (Priority: MEDIUM)
Generate AI-optimized content pages that help sites get recommended by AI engines.

| # | Task | Files | Effort |
|---|------|-------|--------|
| 6.1 | Design page generation prompt based on scan data + industry | Design doc | Medium |
| 6.2 | Create `POST /api/content/generate` route | New API route | Medium |
| 6.3 | Track monthly generation usage per user | DB field or new table | Small |
| 6.4 | Add `maxContentPages` to plan config | `src/lib/pricing.ts` | Small |
| 6.5 | Build content generation UI with preview | New page/component | High |
| 6.6 | Add copy/download for generated content (HTML, Markdown) | UI feature | Small |
| 6.7 | Gate behind `content_generation` feature flag (Pro+) | `src/lib/pricing.ts` | Small |

### Phase 7: Team/Seat Management (COMPLETE)
Multi-user access under a single billing account. See [19-team-management.md](./19-team-management.md).

| # | Task | Files | Effort |
|---|------|-------|--------|
| 7.1 | Design team data model (teams, team_members, roles) | Schema design | Medium |
| 7.2 | Create `teams` and `team_members` tables | New migration | Medium |
| 7.3 | Create team CRUD API routes | New API routes | High |
| 7.4 | Add invite system (email-based) | New API + email template | High |
| 7.5 | Update auth/access to check team membership | `src/lib/access.ts` | Medium |
| 7.6 | Build team settings UI | New page | High |
| 7.7 | Enforce seat limits per tier | Access checks | Small |

### Phase 8: "Fix My Site" Service Add-on (COMPLETE)
One-time paid service for hands-on site optimization. See [20-fix-my-site.md](./20-fix-my-site.md).

| # | Task | Files | Effort |
|---|------|-------|--------|
| 8.1 | Create service intake form (domain, files needed, notes) | New page/component | Medium |
| 8.2 | Create one-time Stripe checkout for $499 | Stripe integration | Medium |
| 8.3 | Send order notification email to team | Resend email | Small |
| 8.4 | Add service status tracking (ordered → in progress → delivered) | DB + UI | Medium |
| 8.5 | Show service option on pricing page and post-scan report | UI updates | Small |

---

## 4. Files Changed Per Phase

### Phase 1 (Pricing Core) — Primary Files
```
src/lib/pricing.ts              — Plan definitions, gates, prices
src/lib/access.ts               — AccessInfo interface, getUserAccess()
src/lib/user-profile.ts         — VALID_PLANS, UserUsage, upgradeUserPlan()
src/lib/services/stripe-payment.ts — Price IDs, checkout
src/components/pricing/pricing-section.tsx — Pricing page UI
src/hooks/use-plan.ts           — Client-side plan hook
src/app/api/auth/me/route.ts    — Auth response
docs/04-plan-access.md          — Documentation update
```

### Phase 2 (Platform Gating) — Primary Files
```
src/lib/pricing.ts              — Platform limits per tier
src/lib/access.ts               — maxPlatforms field
src/app/api/scan/route.ts       — Enforce platform limit
src/app/api/cron/monitor/route.ts — Filter engines
supabase/migrations/015_*.sql   — Platform selection storage
src/app/settings/ (new)         — Platform picker UI
```

### Phase 3 (Data Export) — Primary Files
```
src/lib/export.ts (new)         — CSV/JSON generation utility
src/app/api/export/ (new)       — Export endpoints
src/lib/pricing.ts              — data_export feature gate
```

---

## 5. Migration from Current Tiers

### Existing Subscribers
- `starter_monthly` / `starter_annual` users → Keep on Starter (price changes on next renewal if desired, or grandfather)
- `pro_monthly` / `pro_annual` users → Keep on Pro (features expand at same effective tier level)
- No existing Growth subscribers (new tier)

### Database Changes
- `planStringToTier()` updated to handle `growth_monthly`, `growth_annual`
- `VALID_PLANS` set expanded
- No breaking changes to existing `user_profiles.plan` values

### Stripe Changes
- Create 2 new Stripe Products: Growth Monthly, Growth Annual
- Update existing Starter/Pro prices (or create new prices and archive old ones)
- Add env vars: `STRIPE_PRICE_GROWTH_MONTHLY`, `STRIPE_PRICE_GROWTH_ANNUAL`
- Optionally update Starter/Pro prices: `STRIPE_PRICE_STARTER_MONTHLY` etc.

---

## 6. Competitor Feature Comparison

| Feature | AISO (New) | Cognizo | Otterly | Profound |
|---|---|---|---|---|
| Entry price | $49/mo | $149/mo | $29/mo | $99/mo |
| Mid price | $99/mo | $499/mo | $189/mo | $399/mo |
| Free tier | Yes | No | Yes (limited) | No |
| Platforms tracked | 2-6 | 3-5 | 4 | 1-10+ |
| AI content gen | Pro+ (2-5/mo) | Yes (2-5/mo) | No | Growth (3/mo) |
| Region targeting | Pro+ (3+) | Yes | Yes (50+) | Unknown |
| Data export | Pro+ | Unknown | Standard+ | Growth+ |
| Competitor tracking | Pro+ (3-10) | Unknown | No | Unknown |
| AI crawler analytics | Starter+ | Unknown | No | No |
| AI referral tracking | Starter+ | Unknown | No | No |
| Score badge | All tiers | Unknown | No | No |
| Fix file generation | All tiers | No | No | No |

**AISO differentiators**: AI crawler analytics, AI referral tracking, fix file generation, score badges, and competitive pricing.

---

## 7. Revenue Projections (Conservative)

| Scenario | Starter ($49) | Pro ($99) | Growth ($249) | Monthly Revenue |
|---|---|---|---|---|
| 10 customers | 5 | 4 | 1 | $890 |
| 25 customers | 12 | 10 | 3 | $2,325 |
| 50 customers | 25 | 18 | 7 | $4,757 |
| 100 customers | 50 | 35 | 15 | $9,690 |

Add-on revenue from "Fix My Site" ($499 one-time) could add $2,000-5,000/mo with 4-10 orders.
