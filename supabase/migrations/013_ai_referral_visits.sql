CREATE TABLE ai_referral_visits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain        text NOT NULL,
  source_engine text NOT NULL,
  referrer_url  text,
  landing_page  text NOT NULL,
  user_agent    text,
  visited_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_referral_visits_domain ON ai_referral_visits (domain, visited_at DESC);
CREATE INDEX idx_referral_visits_engine ON ai_referral_visits (domain, source_engine);
ALTER TABLE ai_referral_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on ai_referral_visits"
  ON ai_referral_visits FOR ALL USING (auth.role() = 'service_role');
