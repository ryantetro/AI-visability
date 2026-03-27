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
