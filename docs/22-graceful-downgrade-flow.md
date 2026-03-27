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
- Issues show as blue advisories with cleanup links (not amber blockers)
- Confirm button is always enabled for downgrades

### Auto-trim (on webhook)
1. `customer.subscription.updated` fires with lower tier
2. Webhook reads current plan, compares tiers using `TIER_LEVEL`
3. `trimWorkspaceToFit()` runs BEFORE `upgradeUserPlan()`:
   - Domains: hide excess (keep N most recently scanned)
   - Competitors: delete excess per domain (keep N most recent)
   - Platforms: keep first N in `AI_PLATFORMS` priority order
   - Regions: keep first N in `REGIONS` priority order
   - Prompts: delete excess per user (keep N most recent)
   - Invitations: revoke excess pending invitations (FIFO)
   - Seats: suspend excess members (owner always protected)
4. `upgradeUserPlan()` updates the plan
5. Post-trim banner shows on next load with "View what changed"

### Subscription deletion
When `customer.subscription.deleted` fires, the same trim runs with free-tier limits (1 domain, 0 competitors, 2 platforms, 1 region, 5 prompts, 1 seat) before the plan is set to `'free'`.

## API contracts

### `PATCH /api/user/trim-banner`
Dismisses the post-trim banner.
- **Auth:** Required (httpOnly cookie)
- **Response:** `{ ok: true }`

### `BillingStatus` (extended)
Three new fields on the billing status response:
- `trimmedAt: string | null` — timestamp of last trim
- `trimBannerDismissed: boolean` — whether user dismissed the banner
- `trimFailed: boolean` — whether trim encountered errors

## Error handling

- Trim is best-effort: if it fails, `trim_failed = true` is set and the plan update still proceeds
- Post-trim banner shows "We couldn't fully adjust your workspace" on failure
- Trim is idempotent: running twice produces the same result
- The `subscription.created` event type is explicitly skipped (only `updated` triggers trim)

## Database changes (migration 022)

- **New table:** `workspace_trim_log` — audit log with `user_id`, `from_plan`, `to_plan`, `details` (JSONB)
- **New columns on `user_profiles`:** `last_workspace_trim_at`, `trim_banner_dismissed`, `trim_failed`
- **New column on `team_members`:** `status` (`'active'` | `'suspended'`, default `'active'`)

## Configuration

- No new env vars required
- `TIER_LEVEL` is now exported from `src/lib/pricing.ts` for numeric tier comparison
- Plan limits come from `PLANS[tier]` in `pricing.ts`
- Platform priority: `AI_PLATFORMS` array order (ChatGPT, Perplexity, Gemini, Claude, Copilot, Grok)
- Region priority: `REGIONS` array order from `region-gating.ts`
