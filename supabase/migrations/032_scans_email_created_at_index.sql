-- ============================================================
-- 032 — Composite index on scans (email, created_at DESC)
--
-- Background:
--   /api/user/scans does `where email in (...) order by created_at desc`.
--   With only the plain `idx_scans_email` index, Postgres index-scans by
--   email then sorts in memory. As a user's scan history grows, the sort
--   step gets expensive and the query approaches Supabase's
--   statement_timeout (we observed 6.4s in production).
--
-- Fix:
--   Add a composite index that lets the planner satisfy the ORDER BY
--   directly from the index (index-only scan + LIMIT pushdown).
-- ============================================================

create index if not exists idx_scans_email_created_at
  on scans (email, created_at desc);
