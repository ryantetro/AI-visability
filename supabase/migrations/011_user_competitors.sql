-- 011: User Competitors — track competitor URLs with full scan data
CREATE TABLE user_competitors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain           text NOT NULL,
  competitor_url   text NOT NULL,
  competitor_domain text NOT NULL,
  scan_id          text REFERENCES scans(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','scanning','complete','failed')),
  added_at         timestamptz NOT NULL DEFAULT now(),
  last_scanned_at  timestamptz,
  UNIQUE(user_id, domain, competitor_domain)
);

CREATE INDEX idx_uc_user_domain ON user_competitors (user_id, domain);

ALTER TABLE user_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on user_competitors"
  ON user_competitors FOR ALL USING (auth.role() = 'service_role');
