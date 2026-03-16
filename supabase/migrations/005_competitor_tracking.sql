-- Competitor tracking in AI answers
-- Records which competitors appear alongside (or instead of) the user's brand

CREATE TABLE competitor_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  competitor text NOT NULL,
  competitor_domain text,
  engine text NOT NULL,
  prompt_id uuid REFERENCES monitored_prompts(id) ON DELETE SET NULL,
  position integer,
  co_mentioned boolean NOT NULL DEFAULT false,
  week_start date NOT NULL DEFAULT date_trunc('week', now())::date,
  detected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitor_appearances_domain ON competitor_appearances (domain, week_start DESC);
CREATE INDEX idx_competitor_appearances_competitor ON competitor_appearances (domain, competitor);
CREATE INDEX idx_competitor_appearances_engine ON competitor_appearances (domain, engine);
CREATE INDEX idx_competitor_appearances_prompt ON competitor_appearances (prompt_id);

-- RLS: service role only (matches existing pattern)
ALTER TABLE competitor_appearances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on competitor_appearances"
  ON competitor_appearances FOR ALL
  USING (auth.role() = 'service_role');
