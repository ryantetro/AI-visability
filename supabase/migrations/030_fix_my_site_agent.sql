-- 030_fix_my_site_agent.sql
-- Add columns for agent-generated Fix My Site deliverables

ALTER TABLE fix_my_site_orders
  ADD COLUMN IF NOT EXISTS generated_files  JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS guide_markdown   TEXT,
  ADD COLUMN IF NOT EXISTS agent_progress   JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scan_id          TEXT REFERENCES scans(id);
