# Scans Domain Indexing

## What it does

Adds an indexed, generated `domain` column on the `scans` table so that domain-scoped lookups (e.g. "give me the latest completed scan for `marine-products.com`") are served by a btree index instead of a sequential scan with a leading-wildcard `ILIKE`.

## Why

`findLatestScanByDomain` previously filtered with `url ILIKE '%<domain>%'`. Leading-wildcard `ILIKE` cannot use a btree index, so Postgres ran a sequential scan over the entire `scans` table. As the table grew, the query exceeded Supabase's `statement_timeout` and was canceled with Postgres error `57014` (`canceling statement due to statement timeout`). PostgREST surfaced this as an HTTP 500 to the app, which broke any dashboard page that needed the latest scan for a domain.

## Key files

| File | Role |
|------|------|
| `supabase/migrations/031_scans_domain_column.sql` | Adds `scans.domain` (STORED generated column) + two indexes. |
| `src/lib/services/supabase-db.ts` | `findLatestScanByDomain` now filters `domain=eq.<host>` with `limit=1`. |
| `src/app/api/debug/leaderboard-scans/route.ts` | Debug route switched off `url=ilike.*` onto `domain=eq.`. |
| `docs/01-database-schema.md` | Updated `scans` table reference. |

## How it works

`domain` is defined as:

```sql
domain text generated always as (
  lower(split_part(regexp_replace(url, '^https?://', ''), '/', 1))
) stored
```

This is equivalent to `new URL(url).hostname.toLowerCase()` in JS — it preserves any `www.` prefix to match the application's existing `getDomain()` semantics. Postgres keeps the column in sync automatically; application code does not insert into it.

Two indexes back the column:

- `idx_scans_domain` — plain `(domain)`, general-purpose.
- `idx_scans_domain_status_completed` — composite `(domain, status, completed_at DESC NULLS LAST, created_at DESC)`. Covers the hot-path shape: filter by domain+status, ordered for "latest first".

With the composite index in place, `findLatestScanByDomain` is a single index seek + limit instead of a full table scan.

## Query shape

Before:

```
GET /rest/v1/scans?
  status=eq.complete
  &order=completed_at.desc.nullslast,created_at.desc
  &limit=50
  &url=ilike.*marine-products.com*
```

After:

```
GET /rest/v1/scans?
  domain=eq.marine-products.com
  &status=eq.complete
  &order=completed_at.desc.nullslast,created_at.desc
  &limit=1
```

## Error handling

If the migration is not yet applied, `domain=eq.` queries return PostgREST 400 (`column does not exist`) rather than silently scanning. This is a deliberate fail-loud signal that migration 031 must be applied before deploying the code change.

## Configuration

No env vars or feature flags. Migration 031 must be applied to every Supabase environment before the code change is deployed.

## Deployment notes

- Adding a STORED generated column performs a one-time table rewrite. On a large `scans` table this briefly blocks writes; run during low-traffic.
- Index creation uses plain `CREATE INDEX` (not `CONCURRENTLY`) to stay compatible with Supabase's transactional migration runner. If/when the table grows large enough that this matters, switch to `CREATE INDEX CONCURRENTLY` and split into a non-transactional migration.

## Future cleanup

- If we want bare-domain queries to match `www.`-prefixed URLs (currently they don't, matching the prior `getDomain()` semantics), change the generated expression to strip `^www\.` as well, and update callers accordingly.
- Other tables that do domain-scoped lookups via substring matches should adopt the same pattern.
