-- AI crawler visit tracking
-- Logs when known AI bots (GPTBot, PerplexityBot, ClaudeBot, etc.) visit monitored domains

CREATE TABLE ai_crawler_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  bot_name text NOT NULL,
  bot_category text NOT NULL,  -- 'indexing' | 'citation' | 'training' | 'unknown'
  page_path text NOT NULL,
  user_agent text,
  response_code integer,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crawler_visits_domain ON ai_crawler_visits (domain, visited_at DESC);
CREATE INDEX idx_crawler_visits_bot ON ai_crawler_visits (domain, bot_name);
CREATE INDEX idx_crawler_visits_date ON ai_crawler_visits (visited_at DESC);

-- RLS: service role only
ALTER TABLE ai_crawler_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ai_crawler_visits"
  ON ai_crawler_visits FOR ALL
  USING (auth.role() = 'service_role');
