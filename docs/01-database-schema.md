# Database Schema

All tables live in Supabase (Postgres). The consolidated schema is in `supabase/schema.sql`. Individual migrations are in `supabase/migrations/`.

## Tables

### `scans`
Core scan jobs. One row per website analysis.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | Scan ID (generated UUID string) |
| `url` | `text` | Original URL submitted |
| `normalized_url` | `text` | Canonical URL for dedup |
| `status` | `text` | `pending` / `crawling` / `scoring` / `complete` / `failed` |
| `progress` | `jsonb` | Step-by-step progress tracking |
| `enrichments` | `jsonb` | Web health and other enrichments |
| `email` | `text` | User email who initiated the scan |
| `paid` | `boolean` | Legacy per-scan paid flag (being phased out in favor of plan-based access) |
| `created_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | |
| `crawl_data` | `jsonb` | Raw crawl results |
| `score_result` | `jsonb` | Scoring output |
| `generated_files` | `jsonb` | Generated fix files (robots.txt, llms.txt, etc.) |
| `mention_summary` | `jsonb` | AI mention analysis results |

**Indexes**: `normalized_url`, `status`, `email`, `completed_at DESC`

---

### `user_profiles`
Per-account state. Created on first login via `getOrCreateProfile()`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | Supabase auth user ID |
| `email` | `text` UNIQUE | User email |
| `plan` | `text` | Plan string: `free`, `starter_monthly`, `pro_annual`, etc. |
| `scans_used` | `integer` | Total scan count |
| `free_scan_limit` | `integer` | Default 3 |
| `stripe_customer_id` | `text` UNIQUE | Stripe Customer ID (set on first checkout) |
| `stripe_subscription_id` | `text` | Active Stripe Subscription ID |
| `plan_expires_at` | `timestamptz` | Current billing period end |
| `plan_updated_at` | `timestamptz` | Last plan change timestamp |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Key functions**: `getOrCreateProfile()`, `upgradeUserPlan()`, `getUserUsage()` in `src/lib/user-profile.ts`

---

### `user_domains`
Persistent domain tracking per user. Replaces localStorage-only storage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | Auto-generated |
| `user_id` | `text` FK | References `user_profiles(id)` with cascade delete |
| `domain` | `text` | e.g. `example.com` |
| `url` | `text` | Full URL if provided |
| `hidden` | `boolean` | Soft-delete flag (default `false`) |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Unique constraint**: `(user_id, domain)` -- one row per user per domain
**Index**: `user_id`
**Migration**: `supabase/migrations/009_user_domains.sql`

---

### Other Tables

| Table | Purpose |
|-------|---------|
| `domain_verifications` | Ownership proof for public profiles |
| `public_profiles` | Public score pages, badges, leaderboard |
| `monitoring_domains` | Score-drop alert configuration |
| `monitored_prompts` | Recurring AI engine prompt tracking |
| `prompt_results` | Individual engine test results per prompt |
| `competitor_appearances` | Competitor tracking in AI answers |
| `ai_crawler_visits` | Bot visit logging |

---

## Row Level Security

All tables have RLS enabled. All access goes through the `service_role` key server-side. There are no client-side Supabase queries in the app -- all DB access is through API route handlers.

## Migrations

| File | Purpose |
|------|---------|
| `009_user_domains.sql` | Creates `user_domains` table |
| `010_stripe_fields.sql` | Adds `stripe_customer_id`, `stripe_subscription_id`, `plan_expires_at`, `plan_updated_at` to `user_profiles` |

## RPC Functions

- `increment_scans_used(user_id text)` -- Atomically increments `scans_used` counter
