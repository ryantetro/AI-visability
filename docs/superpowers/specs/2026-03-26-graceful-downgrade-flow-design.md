# Graceful Downgrade Flow: Soft Grace + Auto-Trim

## Summary

Replace the current "cleanup-only mode" downgrade flow with a grace period model. Users keep full current-plan access until the billing period ends, then a deterministic auto-trim adjusts the workspace to fit the new plan. No features are blocked during the transition.

## Problem

The current downgrade flow blocks features before the user has cleaned up, creating a catch-22: users need to remove domains/competitors/platforms to downgrade, but the cleanup tools may themselves be gated behind the features being removed. The "Active cleanup required" state with hard blockers creates friction and confusion.

## Design

### Grace Period Behavior

When a user confirms a downgrade (e.g., Growth to Starter):

- **No feature blocking.** The user keeps full access to their current plan until the Stripe billing period ends. `getUserAccess()` returns the current (higher) plan until the webhook fires.
- **Blockers become advisories.** The change plan modal and settings page show limit exceedances as informational warnings, never as gates. The "Confirm change" button is always enabled for downgrades.
- **Persistent banner.** The settings billing section shows: "Switching to [Plan] on [date]. N items will be auto-adjusted." with an expandable list and a "Cancel change" link.
- **Cleanup links remain.** Each warning still links to the relevant management page so users who want manual control can resolve issues before the effective date.

### Auto-Trim Logic

A `trimWorkspaceToFit(userId, newTier)` function runs inside the Stripe webhook handler when the plan drops to a lower tier (including subscription deletion to free). It trims resources in a deterministic order:

| Resource | Strategy | Preserved? |
|----------|----------|------------|
| Domains | Keep N most recently scanned, hide the rest (`hidden = true`) | Yes (data kept, just inactive) |
| Competitors | Per active domain: keep N most recently added, delete excess rows. When new limit is 0, delete all. | No (rows deleted) |
| Platforms | Per active domain: keep first N in `AI_PLATFORMS` priority order, update `selected_platforms` | Config updated |
| Regions | Per active domain: keep first N in `REGIONS` array order (from `region-gating.ts`), update `selected_regions` | Config updated |
| Prompts | Per member: keep N most recently created, delete excess | No (rows deleted) |
| Pending Invitations | Revoke excess pending invitations (FIFO by `created_at`) before trimming seats | No (invitations revoked) |
| Seats | Rank by `plan_access_rank` then `joined_at`. Owner always protected. Excess members set to `status = 'suspended'` | Yes (can re-activate on upgrade) |
| Content Pages | No trim needed — monthly limit resets naturally. Generation is paused when over limit. | N/A |

Platform priority order: ChatGPT, Perplexity, Gemini, Claude, Copilot, Grok (matches `AI_PLATFORMS` array in `pricing.ts`).

Region priority order: matches `REGIONS` array order in `region-gating.ts`.

After trim:
- Set `last_workspace_trim_at` and reset `trim_banner_dismissed = false` on `user_profiles`
- Insert a `workspace_trim_log` row with JSON details of what was trimmed
- On next app load, show a dismissible banner: "Your workspace was adjusted to fit your [Plan] plan. [View what changed]"

### Webhook Integration Sequence

The trim must run BEFORE the plan is updated in the database. The webhook handler sequence is:

```
1. Receive customer.subscription.updated (or customer.subscription.deleted)
2. Resolve userId from Stripe customer
3. Read CURRENT plan from user_profiles (before any update)
4. Determine new plan from webhook event
5. Compare tiers: oldTier = planStringToTier(currentPlan), newTier = planStringToTier(newPlan)
6. If newTier < oldTier: call trimWorkspaceToFit(userId, newTier)
7. Then call upgradeUserPlan(userId, newPlan) to update the plan
```

For `customer.subscription.deleted`, the new plan is `'free'` and the trim runs with free-tier limits (1 domain, 0 competitors, 2 platforms, 1 region, 5 prompts, 1 seat).

**Timeout budget:** The trim function must complete within 8 seconds. It batches database operations per resource type (single query per resource, not per-row). For workspaces that would require more operations (10+ domains with complex competitor/platform/region data), the function falls back to a best-effort mode: it trims what it can and sets `trim_failed = true` for the remaining items. The post-trim banner then prompts manual cleanup.

### UI Changes

**Change plan modal (`settings-section.tsx`):**
- For `guided_downgrade` decisions: all issues render as amber advisories, not red blockers. Condition: when `targetTier < currentTier`, set severity to `advisory`. When checking overage on the active plan, keep severity as `blocker`.
- The confirm button for downgrades: replace `!canScheduleGuidedChange` with `!selectedTargetPlan || changeTargetIsSamePlan` to remove the readiness gate while preserving basic validation.
- The readiness panel text changes to: "These items will be automatically adjusted when your plan changes on [date]. You can resolve them now if you prefer."
- Issue cleanup links remain functional

**Settings billing section:**
- When a downgrade is pending, show a compact banner: "[Plan] on [date] | N auto-adjustments pending | Cancel"
- Remove the "cleanup-only mode" / "Additive actions are blocked" state entirely

**Post-trim banner:**
- Dismissible banner on first load after trim: "Your workspace was adjusted to fit your [Plan] plan. [View what changed]"
- "View what changed" expands to show the trim log summary

**Navigation/feature gating:**
- No changes during grace period. Access stays at the current plan level.
- After webhook fires, access naturally drops. Auto-trim has already run, so the workspace fits.

## Key Files

| File | Change |
|------|--------|
| `src/lib/billing.ts` | New `trimWorkspaceToFit()` function; modify `buildPlanUsageSnapshot()` to mark all downgrade issues as `advisory` severity when `targetTier < currentTier` |
| `src/app/api/webhooks/stripe/route.ts` | Read current plan before update; call `trimWorkspaceToFit()` when tier drops; also call on `customer.subscription.deleted` |
| `src/app/advanced/settings/settings-section.tsx` | Remove blocker gating on confirm button for downgrades; restyle issues as warnings; add pending downgrade banner; add post-trim banner |
| `src/lib/access.ts` | No changes during grace period (access stays at current plan) |
| `src/lib/team-management.ts` | Update `TeamMember` interface to include `status`; update `getTeamMembers()` and `getTeamForUser()` to filter by `status = 'active'` |
| `supabase/migrations/` | Add `workspace_trim_log` table; add columns to `user_profiles` and `team_members` |

## Database Changes

### New table: `workspace_trim_log`

```sql
CREATE TABLE workspace_trim_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  from_plan text NOT NULL,
  to_plan text NOT NULL,
  trimmed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_trim_log_user ON workspace_trim_log (user_id, trimmed_at DESC);
```

`details` JSON shape:
```json
{
  "domains_hidden": ["example.com", "other.com"],
  "competitors_removed": { "marine-products.com": 2 },
  "platforms_adjusted": { "marine-products.com": { "removed": ["grok"] } },
  "regions_adjusted": { "marine-products.com": { "removed": ["uk-en", "de-de"] } },
  "prompts_removed": { "user123": 10 },
  "invitations_revoked": 2,
  "members_suspended": ["user456"]
}
```

### New columns on `user_profiles`

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_workspace_trim_at timestamptz,
  ADD COLUMN IF NOT EXISTS trim_banner_dismissed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trim_failed boolean DEFAULT false;
```

### New column on `team_members`

```sql
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));
```

## Error Handling

- If `trimWorkspaceToFit()` fails mid-execution, the plan update still proceeds (trim is best-effort). The `trim_failed` flag is set on `user_profiles` and the post-trim banner shows: "We couldn't fully adjust your workspace. Please review your [domains/competitors/etc.]."
- The trim function is idempotent. Running it twice on the same workspace produces the same result.
- If the user upgrades before the downgrade takes effect (cancels and picks a higher plan), no trim runs.
- `trim_banner_dismissed` is reset to `false` each time `trimWorkspaceToFit()` runs so the banner shows after each new trim.
- `trim_failed` is reset to `false` at the start of each trim attempt.

## Testing Strategy

- Unit tests for `trimWorkspaceToFit()` with mock data covering each resource type
- Integration test: schedule downgrade, verify no access changes during grace period, simulate webhook, verify trim results
- Edge cases: user with no excess (no-op trim), user with all resource types over limit, team owner vs member trimming
- Test subscription deletion (to free tier) triggers trim with free-tier limits
- Test concurrent webhook delivery produces the same idempotent result
- Test timeout scenario: large workspace trim stays within 8-second budget
