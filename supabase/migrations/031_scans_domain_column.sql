-- ============================================================
-- 031 — Add indexed `domain` column on scans
--
-- Background:
--   findLatestScanByDomain (src/lib/services/supabase-db.ts) filtered
--   the scans table with `url ILIKE '%example.com%'`. A leading-wildcard
--   ILIKE cannot use a btree index, so as the table grew the query
--   forced a sequential scan and exceeded Supabase's statement_timeout
--   (Postgres error 57014 → PostgREST surfaced as HTTP 500).
--
-- Fix:
--   - Introduce a STORED generated column `domain` derived from `url`,
--     equivalent to `new URL(url).hostname.toLowerCase()` (preserves
--     www to match the application's existing getDomain() semantics).
--   - Add a composite index that covers the hot-path query shape:
--     filter by (domain, status) and order by completed_at/created_at.
--   - Add a plain (domain) index for ad-hoc lookups.
-- ============================================================

alter table scans
  add column if not exists domain text
    generated always as (
      lower(split_part(regexp_replace(url, '^https?://', ''), '/', 1))
    ) stored;

-- Hot path: findLatestScanByDomain — equality on (domain, status),
-- ordered by completed_at desc nulls last, then created_at desc.
create index if not exists idx_scans_domain_status_completed
  on scans (domain, status, completed_at desc nulls last, created_at desc);

-- General-purpose lookup (debug routes, future callers).
create index if not exists idx_scans_domain
  on scans (domain);
