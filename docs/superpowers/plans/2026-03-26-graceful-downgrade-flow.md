# Graceful Downgrade Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "cleanup-only mode" downgrade flow with a grace period model where users keep full access until billing period ends, then auto-trim adjusts the workspace to fit the new plan.

**Architecture:** A `trimWorkspaceToFit()` function in `billing.ts` runs inside the Stripe webhook handler when a tier drops. It trims resources deterministically (domains hidden, competitors deleted, platforms/regions adjusted, prompts deleted, invitations revoked, members suspended). The UI changes blockers to advisories for downgrades and removes the confirm-button gate.

**Tech Stack:** Next.js, TypeScript, Supabase (Postgres), Stripe webhooks

**Spec:** `docs/superpowers/specs/2026-03-26-graceful-downgrade-flow-design.md`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/022_graceful_downgrade_workspace_trim.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 022_graceful_downgrade_workspace_trim.sql
-- Adds workspace trim log table and supporting columns for graceful downgrades

-- Trim audit log
CREATE TABLE IF NOT EXISTS workspace_trim_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  from_plan text NOT NULL,
  to_plan text NOT NULL,
  trimmed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_trim_log_user
  ON workspace_trim_log (user_id, trimmed_at DESC);

-- Profile columns for trim state
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_workspace_trim_at timestamptz,
  ADD COLUMN IF NOT EXISTS trim_banner_dismissed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trim_failed boolean DEFAULT false;

-- Team member suspension support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'status'
  ) THEN
    ALTER TABLE team_members
      ADD COLUMN status text NOT NULL DEFAULT 'active';
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_status_check CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;
```

- [ ] **Step 2: Verify the migration can be applied**

Run: `npx supabase db reset --dry-run 2>&1 | tail -5` (or if that's not available, just verify the SQL is syntactically valid by reading it)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/022_graceful_downgrade_workspace_trim.sql
git commit -m "feat: add migration 022 for graceful downgrade workspace trim"
```

---

### Task 2: Update TeamMember Interface and Queries

**Files:**
- Modify: `src/lib/team-management.ts:14-22` (TeamMember interface)
- Modify: `src/lib/team-management.ts:87-106` (getTeamForUser query)
- Modify: `src/lib/team-management.ts:108-129` (getTeamMembers query)
- Modify: `src/lib/pricing.ts:138` (export TIER_LEVEL)

- [ ] **Step 1: Export `TIER_LEVEL` from `pricing.ts`**

In `src/lib/pricing.ts`, find line 138:
```typescript
const TIER_LEVEL: Record<PlanTier, number> = {
```

Change to:
```typescript
export const TIER_LEVEL: Record<PlanTier, number> = {
```

This is needed by Tasks 4 and 5 which compare tier levels numerically.

- [ ] **Step 2: Add `status` field to `TeamMember` interface**

In `src/lib/team-management.ts`, find the `TeamMember` interface (line 14-22) and add the `status` field:

```typescript
export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'member';
  status: 'active' | 'suspended';
  plan_access_rank: number | null;
  joined_at: string;
  email?: string;
}
```

- [ ] **Step 3: Update `getTeamForUser()` to only return active memberships**

In `src/lib/team-management.ts`, find `getTeamForUser()` (line 87-106). Add `.eq('status', 'active')` to the query chain so suspended members are invisible to the team lookup:

```typescript
const { data, error } = await supabase
  .from('team_members')
  .select('role, team_id, teams(*)')
  .eq('user_id', userId)
  .eq('status', 'active')
  .limit(1)
  .single();
```

- [ ] **Step 4: Update `getTeamMembers()` to include status in select and filter active members**

In `src/lib/team-management.ts`, find the `getTeamMembers()` function (lines 108-129):
- Add `status` to the select clause
- Add `.eq('status', 'active')` filter
- Map `status` in the return value

The select should become:
```typescript
.select('id, team_id, user_id, role, status, plan_access_rank, joined_at, user_profiles(email)')
```

Add after the `.eq('team_id', teamId)` line:
```typescript
.eq('status', 'active')
```

And in the map function, add:
```typescript
status: (row.status as 'active' | 'suspended') ?? 'active',
```

- [ ] **Step 5: Fix synthetic TeamMember in `resolveBillingContext`**

In `src/lib/billing.ts`, find `resolveBillingContext()` at the solo-user path (~line 655). There's a synthetic `TeamMember` object that will fail TypeScript after the interface change. Add `status: 'active' as const`:

```typescript
teamMembers: [{
  id: userId,
  team_id: '',
  user_id: userId,
  role: 'owner',
  status: 'active' as const,
  plan_access_rank: 0,
  joined_at: profile.created_at,
  email: profile.email,
}],
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Clean compile (or only pre-existing warnings)

- [ ] **Step 7: Commit**

```bash
git add src/lib/team-management.ts src/lib/pricing.ts src/lib/billing.ts
git commit -m "feat: export TIER_LEVEL, add status field to TeamMember, filter suspended members"
```

---

### Task 3: Write `trimWorkspaceToFit()` Function

**Files:**
- Modify: `src/lib/billing.ts` (add new exported function after `buildPlanUsageSnapshot`)

This is the core function. It takes a user ID and new tier, queries all workspace resources, and trims anything over the new plan's limits.

- [ ] **Step 1: Add the `TrimResult` interface and `trimWorkspaceToFit()` function**

Add after the `buildPlanUsageSnapshot` function (around line 890) in `src/lib/billing.ts`:

```typescript
export interface TrimResult {
  trimmed: boolean;
  details: {
    domains_hidden: string[];
    competitors_removed: Record<string, number>;
    platforms_adjusted: Record<string, { removed: string[] }>;
    regions_adjusted: Record<string, { removed: string[] }>;
    prompts_removed: Record<string, number>;
    invitations_revoked: number;
    members_suspended: string[];
  };
}

/**
 * Deterministically trim workspace resources to fit within a plan's limits.
 * Called by the Stripe webhook handler when a plan tier drops.
 * Idempotent: running twice produces the same result.
 */
export async function trimWorkspaceToFit(
  userId: string,
  newPlan: string,
  oldPlan: string,
): Promise<TrimResult> {
  const supabase = getSupabaseClient();
  const newTier = planStringToTier(newPlan);
  const limits = PLANS[newTier];
  const maxDomains = normalizeLimit(limits.domains);
  const maxCompetitors = normalizeLimit(limits.competitors);
  const maxPlatforms = normalizeLimit(limits.platforms);
  const maxRegions = normalizeLimit(limits.regions);
  const maxPrompts = normalizeLimit(limits.prompts);
  const maxSeats = normalizeLimit(limits.seats);

  const details: TrimResult['details'] = {
    domains_hidden: [],
    competitors_removed: {},
    platforms_adjusted: {},
    regions_adjusted: {},
    prompts_removed: {},
    invitations_revoked: 0,
    members_suspended: [],
  };

  // Resolve team context
  const { data: teamRow } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();

  const teamId = teamRow?.team_id ?? null;

  // Get all effective user IDs (owner + active team members)
  const effectiveUserIds = [userId];
  if (teamId) {
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id, role, plan_access_rank, joined_at, id')
      .eq('team_id', teamId)
      .eq('status', 'active');
    if (members) {
      for (const m of members) {
        if (m.user_id !== userId) effectiveUserIds.push(m.user_id);
      }
    }
  }

  // ── 1. Trim domains ──────────────────────────────────────────
  if (maxDomains !== null) {
    const { data: domains } = await supabase
      .from('user_domains')
      .select('id, domain, updated_at')
      .in('user_id', effectiveUserIds)
      .eq('hidden', false)
      .order('updated_at', { ascending: false });

    if (domains && domains.length > maxDomains) {
      const toHide = domains.slice(maxDomains);
      const hideIds = toHide.map((d) => d.id);
      await supabase
        .from('user_domains')
        .update({ hidden: true, updated_at: new Date().toISOString() })
        .in('id', hideIds);
      details.domains_hidden = toHide.map((d) => d.domain);
    }
  }

  // Get active (non-hidden) domains for per-domain trimming
  const { data: activeDomains } = await supabase
    .from('user_domains')
    .select('id, domain, user_id, selected_platforms, selected_regions')
    .in('user_id', effectiveUserIds)
    .eq('hidden', false);

  const activeDomainList = activeDomains ?? [];

  // ── 2. Trim competitors ──────────────────────────────────────
  // Fetch all competitors in one query, then trim per-domain in memory
  if (maxCompetitors !== null) {
    const activeDomainNames = activeDomainList.map((d) => d.domain);
    const { data: allComps } = await supabase
      .from('user_competitors')
      .select('id, competitor_domain, domain, user_id, created_at')
      .in('user_id', effectiveUserIds)
      .in('domain', activeDomainNames)
      .order('created_at', { ascending: false });

    if (allComps) {
      // Group by domain
      const compsByDomain = new Map<string, typeof allComps>();
      for (const c of allComps) {
        const list = compsByDomain.get(c.domain) ?? [];
        list.push(c);
        compsByDomain.set(c.domain, list);
      }

      const allRemoveIds: string[] = [];
      for (const [domain, comps] of compsByDomain) {
        if (comps.length > maxCompetitors) {
          const toRemove = comps.slice(maxCompetitors);
          allRemoveIds.push(...toRemove.map((c) => c.id));
          details.competitors_removed[domain] = toRemove.length;
        }
      }

      if (allRemoveIds.length > 0) {
        await supabase.from('user_competitors').delete().in('id', allRemoveIds);
      }
    }
  }

  // ── 3. Trim platforms ────────────────────────────────────────
  if (maxPlatforms !== null) {
    for (const ud of activeDomainList) {
      const currentPlatforms: string[] = ud.selected_platforms ?? [...AI_PLATFORMS];
      if (currentPlatforms.length > maxPlatforms) {
        // Keep first N in AI_PLATFORMS priority order
        const kept = AI_PLATFORMS.filter((p) => currentPlatforms.includes(p)).slice(0, maxPlatforms);
        const removed = currentPlatforms.filter((p) => !kept.includes(p as typeof AI_PLATFORMS[number]));
        await supabase
          .from('user_domains')
          .update({ selected_platforms: [...kept], updated_at: new Date().toISOString() })
          .eq('id', ud.id);
        if (removed.length > 0) {
          details.platforms_adjusted[ud.domain] = { removed };
        }
      }
    }
  }

  // ── 4. Trim regions ──────────────────────────────────────────
  if (maxRegions !== null) {
    for (const ud of activeDomainList) {
      const currentRegions: string[] = ud.selected_regions ?? ['us-en'];
      if (currentRegions.length > maxRegions) {
        // Keep first N in REGIONS priority order
        const regionOrder = REGIONS.map((r) => r.id);
        const kept = regionOrder.filter((r) => currentRegions.includes(r)).slice(0, maxRegions);
        const removed = currentRegions.filter((r) => !kept.includes(r));
        await supabase
          .from('user_domains')
          .update({ selected_regions: kept, updated_at: new Date().toISOString() })
          .eq('id', ud.id);
        if (removed.length > 0) {
          details.regions_adjusted[ud.domain] = { removed };
        }
      }
    }
  }

  // ── 5. Trim prompts ──────────────────────────────────────────
  // Fetch all prompts in one query, then trim per-user in memory
  if (maxPrompts !== null) {
    const { data: allPrompts } = await supabase
      .from('monitored_prompts')
      .select('id, user_id, created_at')
      .in('user_id', effectiveUserIds)
      .order('created_at', { ascending: false });

    if (allPrompts) {
      const promptsByUser = new Map<string, typeof allPrompts>();
      for (const p of allPrompts) {
        const list = promptsByUser.get(p.user_id) ?? [];
        list.push(p);
        promptsByUser.set(p.user_id, list);
      }

      const allRemoveIds: string[] = [];
      for (const [uid, prompts] of promptsByUser) {
        if (prompts.length > maxPrompts) {
          const toRemove = prompts.slice(maxPrompts);
          allRemoveIds.push(...toRemove.map((p) => p.id));
          details.prompts_removed[uid] = toRemove.length;
        }
      }

      if (allRemoveIds.length > 0) {
        await supabase.from('monitored_prompts').delete().in('id', allRemoveIds);
      }
    }
  }

  // ── 6. Trim pending invitations ──────────────────────────────
  if (teamId && maxSeats !== null) {
    const { data: invitations } = await supabase
      .from('team_invitations')
      .select('id, created_at')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    const { data: activeMembers } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('status', 'active');

    const memberCount = activeMembers?.length ?? 1;
    const inviteCount = invitations?.length ?? 0;
    const totalSeats = memberCount + inviteCount;

    if (totalSeats > maxSeats && invitations && invitations.length > 0) {
      const invitesToRevoke = Math.min(invitations.length, totalSeats - maxSeats);
      const revokeIds = invitations.slice(0, invitesToRevoke).map((i) => i.id);
      await supabase
        .from('team_invitations')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .in('id', revokeIds);
      details.invitations_revoked = invitesToRevoke;
    }
  }

  // ── 7. Suspend excess team members ───────────────────────────
  if (teamId && maxSeats !== null) {
    const { data: activeMembers } = await supabase
      .from('team_members')
      .select('id, user_id, role, plan_access_rank, joined_at')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('plan_access_rank', { ascending: true, nullsFirst: false })
      .order('joined_at', { ascending: true });

    if (activeMembers && activeMembers.length > maxSeats) {
      // Owner is always protected — separate them out
      const owner = activeMembers.find((m) => m.role === 'owner');
      const nonOwners = activeMembers.filter((m) => m.role !== 'owner');
      // Keep (maxSeats - 1) non-owners (1 slot reserved for owner)
      const keepCount = Math.max(0, maxSeats - 1);
      const toSuspend = nonOwners.slice(keepCount);
      if (toSuspend.length > 0) {
        const suspendIds = toSuspend.map((m) => m.id);
        await supabase
          .from('team_members')
          .update({ status: 'suspended' })
          .in('id', suspendIds);
        details.members_suspended = toSuspend.map((m) => m.user_id);
      }
    }
  }

  // ── Write trim log and update profile ────────────────────────
  const trimmed = details.domains_hidden.length > 0
    || Object.keys(details.competitors_removed).length > 0
    || Object.keys(details.platforms_adjusted).length > 0
    || Object.keys(details.regions_adjusted).length > 0
    || Object.keys(details.prompts_removed).length > 0
    || details.invitations_revoked > 0
    || details.members_suspended.length > 0;

  if (trimmed) {
    await supabase.from('workspace_trim_log').insert({
      user_id: userId,
      from_plan: oldPlan,
      to_plan: newPlan,
      details,
    });
  }

  await supabase
    .from('user_profiles')
    .update({
      last_workspace_trim_at: trimmed ? new Date().toISOString() : null,
      trim_banner_dismissed: false,
      trim_failed: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return { trimmed, details };
}
```

**Important notes:**

1. This function uses `PLANS`, `planStringToTier`, `AI_PLATFORMS`, `TIER_LEVEL` from `pricing.ts` and `REGIONS` from `region-gating.ts`. `billing.ts` already imports `PLANS`, `planStringToTier`, and `AI_PLATFORMS` from `@/lib/pricing`. Add `TIER_LEVEL` to that existing import (do NOT create a duplicate import line). Also add the `REGIONS` import:

```typescript
// Update existing import to include TIER_LEVEL:
import { AI_PLATFORMS, PLANS, planStringToTier, TIER_LEVEL, ... } from '@/lib/pricing';
// Add new import:
import { REGIONS } from '@/lib/region-gating';
```

2. `normalizeLimit` is already a local helper in `billing.ts` (line 194). It converts `-1` (unlimited) to `null`.

3. **Timeout handling:** The spec requires an 8-second budget. The trim function uses batched queries (one query per resource type, not per-row) which keeps it fast. The `trimWorkspaceToFit()` caller in the webhook (Task 5) wraps it in a try/catch — if it takes too long or fails, `trim_failed = true` is set and the plan update proceeds anyway. No explicit timeout implementation is needed because Supabase queries have their own statement timeouts.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Clean compile

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing.ts
git commit -m "feat: add trimWorkspaceToFit() for graceful downgrades"
```

---

### Task 4: Make Downgrade Issues Advisory (Not Blockers)

**Files:**
- Modify: `src/lib/billing.ts` — issue builder functions and `buildPlanUsageSnapshot`

The goal: when `targetTier < currentTier`, all issues get `severity: 'advisory'` instead of `'blocker'`.

- [ ] **Step 1: Add a `severityOverride` parameter to issue builder functions**

Find each of these internal functions in `billing.ts` and add an optional `severity` parameter:

For `buildPromptIssues` (~line 466), `buildCompetitorIssues` (~line 507), `buildDomainSelectionIssues` (~line 553):
- Add `severity: LimitIssueSeverity = 'blocker'` as the last parameter
- Replace the hardcoded `severity: 'blocker'` in the returned objects with `severity`

For the domain count issue built inline in `buildPlanUsageSnapshot` (~line 749):
- Replace `severity: 'blocker'` with the variable

For seat-related issues (~lines 766, 782, 805):
- Same replacement

- [ ] **Step 2: Pass severity based on tier comparison in `buildPlanUsageSnapshot`**

Inside `buildPlanUsageSnapshot`, after resolving `targetTier` and before the issue-building section (~line 744), add:

```typescript
const isDowngrade = TIER_LEVEL[targetTier] < TIER_LEVEL[context.access.tier];
const issueSeverity: LimitIssueSeverity = isDowngrade ? 'advisory' : 'blocker';
```

Then pass `issueSeverity` to each issue builder call and inline issue construction.

Note: `TIER_LEVEL` was exported from `pricing.ts` in Task 2. Add it to the existing import in `billing.ts`:

```typescript
import { ..., TIER_LEVEL } from '@/lib/pricing';
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Clean compile

- [ ] **Step 4: Commit**

```bash
git add src/lib/billing.ts
git commit -m "feat: use advisory severity for downgrade issues instead of blockers"
```

---

### Task 5: Integrate Trim into Stripe Webhook Handler

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts:175-263`

- [ ] **Step 1: Add trim import at the top of the webhook file**

Add `trimWorkspaceToFit` to the existing billing import:
```typescript
import { trimWorkspaceToFit } from '@/lib/billing';
```

Add `planStringToTier` and `TIER_LEVEL` to the pricing import (check if `planStringToTier` is already imported — add only what's missing):
```typescript
import { planStringToTier, TIER_LEVEL } from '@/lib/pricing';
```

- [ ] **Step 2: Add trim logic to `customer.subscription.updated` handler**

Find the combined `customer.subscription.created` / `customer.subscription.updated` handler (~line 175). **Important:** This handler handles BOTH created and updated events. Trim should ONLY run on `updated` events (created events are always upgrades from free, never downgrades). Add the trim block before the `upgradeUserPlan()` call (~line 201), guarded by the event type:

```typescript
// Auto-trim workspace on subscription UPDATES that are downgrades
// Skip for subscription.created — those are always upgrades from free
if (plan && event.type === 'customer.subscription.updated') {
  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', userId)
    .single();
  const currentPlan = currentProfile?.plan ?? 'free';
  const currentTier = planStringToTier(currentPlan);
  const newTier = planStringToTier(plan);

  if (TIER_LEVEL[newTier] < TIER_LEVEL[currentTier]) {
    try {
      await trimWorkspaceToFit(userId, plan, currentPlan);
    } catch (trimError) {
      // Best-effort: log and set trim_failed flag, but still proceed with plan update
      console.error('[webhook] trimWorkspaceToFit failed:', trimError);
      await supabase
        .from('user_profiles')
        .update({ trim_failed: true, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
  }
}
```

Then the existing `upgradeUserPlan(userId, plan)` call follows on line 202.

- [ ] **Step 3: Add trim logic to `customer.subscription.deleted` handler**

Find the `customer.subscription.deleted` handler (~line 232). Before the `upgradeUserPlan(userId, 'free')` call (~line 244), add the same pattern:

```typescript
// Read current plan before downgrading to free
const { data: currentProfileDel } = await supabase
  .from('user_profiles')
  .select('plan')
  .eq('id', userId)
  .single();
const currentPlanDel = currentProfileDel?.plan ?? 'free';

if (currentPlanDel !== 'free') {
  try {
    await trimWorkspaceToFit(userId, 'free', currentPlanDel);
  } catch (trimError) {
    console.error('[webhook] trimWorkspaceToFit failed on deletion:', trimError);
    await supabase
      .from('user_profiles')
      .update({ trim_failed: true, updated_at: new Date().toISOString() })
      .eq('id', userId);
  }
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Clean compile

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat: call trimWorkspaceToFit on plan downgrades in Stripe webhook"
```

---

### Task 6: UI — Remove Blocker Gate and Restyle for Downgrades

**Files:**
- Modify: `src/app/advanced/settings/settings-section.tsx`

- [ ] **Step 1: Update the confirm button disabled logic**

Find the confirm button (~line 1771-1774). Change the disabled condition for guided changes from:

```typescript
: changePlanLoading || !canScheduleGuidedChange}
```

to:

```typescript
: changePlanLoading || !selectedTargetPlan || changeTargetIsSamePlan}
```

This removes the readiness gate while keeping basic validation.

- [ ] **Step 2: Restyle readiness panel for downgrades**

Find the readiness panel section (~line 1641+). Where the blocker badge is rendered (the `<span>` with `bg-amber-400/10 text-amber-300` for blockers), add a condition so that for downgrades, the text is informational:

Change the readiness panel title text. Find the line that shows `'Guided limit check'` (~line 1657) and update:

```typescript
stripeHostedPlanChange
  ? 'Stripe-hosted change'
  : changePlanPreview.sameEntitlements
    ? 'Billing cycle change only — same features.'
    : selectedTargetIsDowngrade
      ? 'Auto-adjust preview'
      : 'Guided limit check'
```

Change the reason text for downgrades. After the `changePlanPreview.change.reason` paragraph (~line 1660), add a downgrade-specific message:

```typescript
{selectedTargetIsDowngrade && !changePlanPreview.sameEntitlements && (
  <p className="mt-1 text-[11px] leading-4 text-zinc-500">
    These items will be automatically adjusted when your plan changes. You can resolve them now if you prefer.
  </p>
)}
```

Change the badge text for downgrades. In the blocker count badge (~line 1668-1675), when it's a downgrade, show "N auto-adjustments" instead of "N blockers":

```typescript
{stripeHostedPlanChange
  ? 'Stripe'
  : changePlanPreview.blockers
    ? selectedTargetIsDowngrade
      ? `${changePlanPreview.blockers + changePlanPreview.advisories} auto-adjustment${(changePlanPreview.blockers + changePlanPreview.advisories) === 1 ? '' : 's'}`
      : `${changePlanPreview.blockers} blocker${changePlanPreview.blockers === 1 ? '' : 's'}`
    : 'Ready'}
```

And change the badge color for downgrades from amber to a softer blue:

```typescript
stripeHostedPlanChange
  ? 'bg-sky-400/10 text-sky-300'
  : changePlanPreview.blockers
    ? selectedTargetIsDowngrade
      ? 'bg-sky-400/10 text-sky-300'
      : 'bg-amber-400/10 text-amber-300'
    : 'bg-[#25c972]/10 text-[#25c972]'
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Clean compile

- [ ] **Step 4: Commit**

```bash
git add src/app/advanced/settings/settings-section.tsx
git commit -m "feat: remove blocker gate for downgrades, restyle as auto-adjust preview"
```

---

### Task 7: UI — Post-Trim Banner + Pending Downgrade Banner

**Files:**
- Modify: `src/lib/billing.ts:94-106` (BillingStatus interface)
- Modify: `src/lib/billing.ts:889-926` (getBillingStatus function)
- Modify: `src/app/api/billing/status/route.ts` (ensure profile select includes new columns)
- Create: `src/app/api/user/trim-banner/route.ts`
- Modify: `src/app/advanced/settings/settings-section.tsx`

- [ ] **Step 1: Add trim fields to `BillingStatus` interface**

In `src/lib/billing.ts`, find the `BillingStatus` interface (line 94-106). Add three new fields after `activeReadiness`:

```typescript
export interface BillingStatus {
  currentPlan: string;
  currentTier: PlanTier;
  currentPeriodEnd: string | null;
  canManageBilling: boolean;
  billingOwner: BillingOwnerSummary;
  cancelAtPeriodEnd: boolean;
  pendingChange: PendingPlanChange | null;
  overageMode: OverageMode;
  overageIssues: LimitIssue[];
  readiness: PlanUsageSnapshot;
  activeReadiness: PlanUsageSnapshot;
  trimmedAt: string | null;
  trimBannerDismissed: boolean;
  trimFailed: boolean;
}
```

- [ ] **Step 2: Populate trim fields in `getBillingStatus()`**

In `src/lib/billing.ts`, find `getBillingStatus()` (line 889). The function reads from `context.billingProfile` which is a `BillingProfileRecord` that extends `UserProfile`. Add the new columns to `BillingProfileRecord` interface (line 133):

```typescript
interface BillingProfileRecord extends UserProfile {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_schedule_id: string | null;
  pending_plan: string | null;
  pending_plan_effective_at: string | null;
  last_workspace_trim_at: string | null;
  trim_banner_dismissed: boolean;
  trim_failed: boolean;
}
```

Then in the return statement of `getBillingStatus()` (line 913), add:

```typescript
return {
  // ... existing fields ...
  trimmedAt: context.billingProfile.last_workspace_trim_at ?? null,
  trimBannerDismissed: context.billingProfile.trim_banner_dismissed ?? false,
  trimFailed: context.billingProfile.trim_failed ?? false,
};
```

**Critical:** The `resolveBillingContext()` function does NOT have its own select — it delegates to `getBillingProfileById()` (line 645 of `billing.ts`). You must update TWO locations in `getBillingProfileById()`:

1. **The select query** (lines 355-371): Add the three new columns to the select clause:
```typescript
.select(`
  id, email, plan, scans_used, free_scan_limit,
  stripe_customer_id, stripe_subscription_id, stripe_subscription_schedule_id,
  plan_expires_at, plan_cancel_at_period_end,
  pending_plan, pending_plan_effective_at, plan_updated_at,
  last_workspace_trim_at, trim_banner_dismissed, trim_failed,
  created_at, updated_at
`)
```

2. **The fallback return** (lines 383-391): Add the new fields to the fallback object:
```typescript
return {
  ...profile,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_subscription_schedule_id: null,
  pending_plan: null,
  pending_plan_effective_at: null,
  last_workspace_trim_at: null,
  trim_banner_dismissed: false,
  trim_failed: false,
};
```

- [ ] **Step 3: Create the dismiss endpoint**

Create file `src/app/api/user/trim-banner/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  await supabase
    .from('user_profiles')
    .update({ trim_banner_dismissed: true, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Add the post-trim banner to settings (with "View what changed" expandable)**

In `settings-section.tsx`, at the top of the billing section (before the plan card), add a dismissible banner. Add a `trimExpanded` state:

```typescript
const [trimExpanded, setTrimExpanded] = useState(false);
```

Then render the banner when `billingStatus.status?.trimmedAt` is set and `!billingStatus.status?.trimBannerDismissed`:

```typescript
{billingStatus.status?.trimmedAt && !billingStatus.status?.trimBannerDismissed && (
  <div className="mb-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-300" />
        <div>
          <p className="text-[12px] font-medium text-zinc-200">
            {billingStatus.status.trimFailed
              ? "We couldn't fully adjust your workspace. Please review your settings."
              : 'Your workspace was adjusted to fit your new plan.'}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Adjusted on {formatShortDate(parseIsoTimestamp(billingStatus.status.trimmedAt))}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTrimExpanded((prev) => !prev)}
          className="text-[11px] font-medium text-sky-300 transition-colors hover:text-sky-200"
        >
          {trimExpanded ? 'Hide details' : 'View what changed'}
        </button>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/user/trim-banner', { method: 'PATCH' });
            await billingStatus.refresh();
          }}
          className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-white"
        >
          Dismiss
        </button>
      </div>
    </div>
    {trimExpanded && (
      <div className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] leading-5 text-zinc-400">
        <p>Your workspace was automatically adjusted to fit your plan limits. Domains may have been hidden, competitors removed, or platforms/regions adjusted.</p>
        <p className="mt-1">Visit your domain and team settings to review the changes.</p>
      </div>
    )}
  </div>
)}
```

Note: `CheckCircle2` should be imported from `lucide-react`. Check existing imports. Also ensure `formatShortDate` and `parseIsoTimestamp` are available — check if they already exist in the file. If not, add simple helpers or use `new Date(timestamp).toLocaleDateString()`.

- [ ] **Step 5: Add pending downgrade banner to billing section**

Below the post-trim banner (and above the plan card), add a compact banner when a downgrade is pending:

```typescript
{billingStatus.status?.pendingChange && TIER_LEVEL[billingStatus.status.pendingChange.targetTier] < TIER_LEVEL[billingStatus.status.currentTier] && (
  <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3">
    <div className="flex items-center gap-3">
      <Clock className="h-4 w-4 shrink-0 text-amber-300" />
      <p className="text-[12px] text-zinc-200">
        Switching to <span className="font-semibold">{billingStatus.status.pendingChange.targetLabel}</span> on{' '}
        {formatShortDate(parseIsoTimestamp(billingStatus.status.pendingChange.effectiveAt ?? ''))}
        {billingStatus.status.readiness.viewerIssues.length > 0 && (
          <span className="text-zinc-400">
            {' · '}{billingStatus.status.readiness.viewerIssues.length} auto-adjustment{billingStatus.status.readiness.viewerIssues.length === 1 ? '' : 's'} pending
          </span>
        )}
      </p>
    </div>
    <button
      type="button"
      onClick={() => setChangePlanModalOpen(true)}
      className="text-[11px] font-medium text-amber-300 transition-colors hover:text-amber-200"
    >
      Cancel change
    </button>
  </div>
)}
```

Import `Clock` from `lucide-react` if not already imported. Import `TIER_LEVEL` from `@/lib/pricing` if not already imported.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Clean compile

- [ ] **Step 7: Commit**

```bash
git add src/lib/billing.ts src/app/api/user/trim-banner/route.ts src/app/advanced/settings/settings-section.tsx
git commit -m "feat: add post-trim banner, pending downgrade banner, trim-banner dismiss endpoint"
```

---

### Task 8: Remove "Cleanup-Only Mode" State for Pending Downgrades

**Files:**
- Modify: `src/app/advanced/settings/settings-section.tsx:1271-1277` (cleanup-only text)
- Modify: `src/app/advanced/settings/settings-section.tsx:1946-1952` (seat priority cleanup-only text)
- Modify: `src/lib/billing.ts:921` (overageMode in getBillingStatus)

There are two specific locations where "cleanup-only" text appears:

1. **Line 1274** in `settings-section.tsx`: `'Some features are in cleanup-only mode because this workspace is already over the active plan limits.'`
2. **Line 1949** in `settings-section.tsx`: `'...lower-priority members move into cleanup-only access if the team is still over the cap.'`

The `overageMode` field in `BillingStatus` is set to `'cleanup_required'` when the user is over limits on their CURRENT plan (line 921 of `billing.ts`). This is distinct from a pending downgrade.

- [ ] **Step 1: Update the cleanup-only text on line 1274**

In `settings-section.tsx`, find line 1274. This text is shown inside a conditional that renders when `overageMode === 'cleanup_required'`. The text should be updated to distinguish between active overage and pending downgrade. Change:

```typescript
: 'Some features are in cleanup-only mode because this workspace is already over the active plan limits.'}
```

to:

```typescript
: pendingChange
  ? 'Your workspace will be automatically adjusted when the plan change takes effect.'
  : 'Some features are limited because this workspace exceeds the current plan limits.'}
```

- [ ] **Step 2: Update the seat priority text on line 1949**

Change the text to remove the "cleanup-only" language:

```typescript
This scheduled downgrade is tighter than the current seat usage. Pending invites are revoked first, then lower-priority members are suspended when the plan change takes effect.
```

- [ ] **Step 3: Ensure `overageMode` only applies to active plan overage**

In `src/lib/billing.ts`, line 921, verify that `overageMode` only reflects issues on the CURRENT plan (not the pending target plan). Currently:

```typescript
overageMode: overageIssues.length > 0 ? 'cleanup_required' : 'none',
```

This is already correct — `overageIssues` comes from `activeReadiness` (line 911), which is the snapshot against the current plan. No change needed here, but verify this during implementation.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Clean compile

- [ ] **Step 5: Commit**

```bash
git add src/app/advanced/settings/settings-section.tsx
git commit -m "feat: replace cleanup-only mode language with auto-adjust messaging"
```

---

### Task 9: Update Documentation

**Files:**
- Modify: `docs/00-overview.md`
- Create: `docs/22-graceful-downgrade-flow.md`

- [ ] **Step 1: Write the documentation**

Create `docs/22-graceful-downgrade-flow.md` following the project's doc pattern (see `docs/21-payment-flow-fixes-upsells.md` for format):

```markdown
# Graceful Downgrade Flow

## What it does

Replaces the "cleanup-only mode" downgrade flow with a grace period model. Users keep full current-plan access until the billing period ends, then `trimWorkspaceToFit()` automatically adjusts the workspace to fit the new plan.

## Key files

| File | Role |
|------|------|
| `src/lib/billing.ts` | `trimWorkspaceToFit()` function, advisory severity for downgrade issues |
| `src/app/api/webhooks/stripe/route.ts` | Calls trim on tier drops in `subscription.updated` and `subscription.deleted` |
| `src/app/advanced/settings/settings-section.tsx` | Advisory-styled readiness panel, removed blocker gate, post-trim banner |
| `src/lib/team-management.ts` | `TeamMember.status` field, active member filtering |
| `src/app/api/user/trim-banner/route.ts` | Dismiss endpoint for post-trim banner |
| `supabase/migrations/022_graceful_downgrade_workspace_trim.sql` | Schema: `workspace_trim_log` table, profile columns, member status |

## How it works

### Grace period
- User confirms downgrade in settings modal
- Full current-plan access continues until billing period ends
- Issues show as amber advisories with cleanup links (not blockers)
- Confirm button is always enabled for downgrades

### Auto-trim (on webhook)
1. `customer.subscription.updated` fires with lower tier
2. Webhook reads current plan, compares tiers
3. `trimWorkspaceToFit()` runs: domains hidden, competitors deleted, platforms/regions adjusted, prompts deleted, invitations revoked, members suspended
4. `upgradeUserPlan()` updates the plan
5. Post-trim banner shows on next load

### Trim order
Domains > Competitors > Platforms > Regions > Prompts > Invitations > Seats

## Error handling

- Trim is best-effort: if it fails, `trim_failed = true` is set and the plan update still proceeds
- Post-trim banner shows manual cleanup message on failure
- Trim is idempotent: running twice produces the same result
```

- [ ] **Step 2: Update `docs/00-overview.md`**

Add a row to the document index table:

```markdown
| [22-graceful-downgrade-flow.md](./22-graceful-downgrade-flow.md) | Graceful plan downgrade — grace period, auto-trim, advisory issues | `src/lib/billing.ts`, `src/app/api/webhooks/stripe/route.ts` |
```

- [ ] **Step 3: Commit**

```bash
git add docs/22-graceful-downgrade-flow.md docs/00-overview.md
git commit -m "docs: add graceful downgrade flow documentation"
```
