CREATE TABLE IF NOT EXISTS action_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,
  check_id text NOT NULL,
  action_type text NOT NULL DEFAULT 'fix',
  manual_status text NOT NULL DEFAULT 'pending',
  scan_status text NOT NULL DEFAULT 'unknown',
  last_scan_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT action_checklist_action_type_check CHECK (action_type IN ('fix', 'keep_doing')),
  CONSTRAINT action_checklist_manual_status_check CHECK (manual_status IN ('pending', 'done')),
  CONSTRAINT action_checklist_scan_status_check CHECK (scan_status IN ('pass', 'fail', 'unknown')),
  CONSTRAINT action_checklist_unique UNIQUE (user_id, domain, check_id)
);

ALTER TABLE action_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checklist"
  ON action_checklist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checklist"
  ON action_checklist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checklist"
  ON action_checklist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checklist"
  ON action_checklist FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_action_checklist_user_domain
  ON action_checklist (user_id, domain);
