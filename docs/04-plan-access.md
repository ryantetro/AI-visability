# Plan-Based Access Control

## Overview

Feature access is determined by the user's plan tier stored in `user_profiles.plan`. This replaces the legacy pattern of checking `scan.paid` per-scan.

## Key Files

| File | Role |
|------|------|
| `src/lib/pricing.ts` | Plan definitions, tiers, feature gates, price helpers |
| `src/lib/access.ts` | `getUserAccess()` -- single source of truth for server-side access checks |
| `src/hooks/use-plan.ts` | `usePlan()` -- client-side plan state hook |
| `src/lib/user-profile.ts` | `getOrCreateProfile()`, `upgradeUserPlan()`, `getUserUsage()` |

## Plan Tiers

| Tier | Plan Strings | Monthly | Annual |
|------|-------------|---------|--------|
| `free` | `free` | $0 | $0 |
| `starter` | `starter_monthly`, `starter_annual` | $29 | $279 |
| `pro` | `pro_monthly`, `pro_annual` | $79 | $749 |

Legacy strings `lifetime`, `monthly`, `paid` map to `starter` tier.

### Tier Hierarchy
```
free (0) < starter (1) < pro (2)
```

`canAccess(userTier, requiredTier)` returns `true` if user's tier level >= required tier level.

## Plan Limits

| Resource | Free | Starter | Pro |
|----------|------|---------|-----|
| Domains | 1 | 1 | 5 |
| Prompts | 5 | 25 | 100 |
| Monitoring | None | Weekly | Daily |

## Feature Gates

Defined in `FEATURE_GATES` (src/lib/pricing.ts):

| Feature Key | Required Tier | Description |
|-------------|--------------|-------------|
| `copy_to_llm` | starter | Copy-to-LLM prompt export |
| `file_download` | starter | Download generated fix files |
| `full_fixes` | starter | See all fixes (not just top 3) |
| `multi_domain` | pro | Track multiple domains |
| `competitor_radar` | pro | Competitor tracking |
| `ai_crawler` | pro | AI crawler analytics |
| `daily_monitoring` | pro | Daily score monitoring |
| `prompt_tracking_25` | starter | Track 25 prompts |
| `prompt_tracking_100` | pro | Track 100 prompts |
| `topic_performance` | pro | Topic performance analysis |
| `competitor_leaderboard` | starter | Competitor leaderboard |
| `sentiment_analysis` | starter | Sentiment analysis |
| `prompt_metrics` | starter | Prompt metrics dashboard |

## Navigation Gates

Defined in `NAV_GATES`:

| Nav Item | Required Tier |
|----------|--------------|
| dashboard | starter |
| report | free |
| brand | starter |
| competitors | pro |
| history | starter |
| leaderboard | free |
| settings | starter |

## Server-Side Access: `getUserAccess()`

Located in `src/lib/access.ts`. Single function that returns everything a route handler needs:

```typescript
interface AccessInfo {
  tier: PlanTier;        // 'free' | 'starter' | 'pro'
  plan: string;          // Raw plan string from DB
  isPaid: boolean;       // tier !== 'free'
  canAccessFeature: (feature: string) => boolean;
  maxDomains: number;    // From PLANS config
  maxPrompts: number;    // From PLANS config
}

const access = await getUserAccess(userId, email);
if (!access.canAccessFeature('file_download')) {
  return NextResponse.json({ error: 'Payment required' }, { status: 403 });
}
```

### Usage in Route Handlers

All access checks wrap `getUserAccess()` in try-catch and fall back to the legacy `scan.paid` flag if the profile lookup fails. This ensures backward compatibility during migration.

```typescript
let hasAccess = !!scan.paid; // legacy fallback
try {
  const access = await getUserAccess(user.id, user.email);
  hasAccess = access.canAccessFeature('file_download') || hasAccess;
} catch {
  // Profile lookup failed -- fall back to legacy
}
```

**Routes using plan-based access:**
- `GET /api/scan/[id]/files/archive` -- file downloads
- `GET /api/scan/[id]/report` -- `hasPaid` field
- `GET /api/scan/[id]` -- `hasPaid` field

## Client-Side Access: `usePlan()`

Located in `src/hooks/use-plan.ts`. Fetches from `/api/auth/me` and caches in module-level variables.

```typescript
const { tier, plan, isPaid, maxDomains, maxPrompts, loading, refresh } = usePlan();
```

### Cache Behavior
- Module-level cache (`cachedTier`, `cachedPlan`, etc.) persists across re-renders
- First mount fetches from API; subsequent mounts use cache
- Call `invalidatePlanCache()` after plan changes (e.g., successful upgrade)
- Call `refresh()` to force a fresh fetch

### Integration with DomainContext
`DomainContextProvider` uses `usePlan()` to derive `hasPaidAccess`:

```typescript
const { tier: planTier, isPaid: planIsPaid } = usePlan();
const hasPaidAccess = debugPaidPreview || planIsPaid || paidOverride || Boolean(report?.hasPaid) || recentScans.some((s) => s.hasPaid);
```

## Plan String Conversion

`planStringToTier(plan: string): PlanTier` converts stored plan strings to tiers:

| Input | Output |
|-------|--------|
| `free` | `free` |
| `starter_monthly` | `starter` |
| `starter_annual` | `starter` |
| `pro_monthly` | `pro` |
| `pro_annual` | `pro` |
| `lifetime` | `starter` (legacy) |
| `monthly` | `starter` (legacy) |
| `paid` | `starter` (legacy) |
| anything else | `free` |
