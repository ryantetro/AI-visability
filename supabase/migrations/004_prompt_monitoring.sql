-- Persistent prompt monitoring tables
-- Allows users to track specific prompts across AI engines on a recurring basis

CREATE TABLE monitored_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  user_id uuid NOT NULL,
  prompt_text text NOT NULL,
  category text NOT NULL DEFAULT 'custom',  -- 'brand' | 'competitor' | 'industry' | 'custom'
  industry text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_monitored_prompts_domain ON monitored_prompts (domain);
CREATE INDEX idx_monitored_prompts_user ON monitored_prompts (user_id);
CREATE INDEX idx_monitored_prompts_active ON monitored_prompts (domain, active) WHERE active = true;

CREATE TABLE prompt_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES monitored_prompts(id) ON DELETE CASCADE,
  domain text NOT NULL,
  engine text NOT NULL,  -- 'chatgpt' | 'perplexity' | 'gemini' | 'claude'
  mentioned boolean NOT NULL DEFAULT false,
  position integer,
  sentiment text,  -- 'positive' | 'neutral' | 'negative'
  citation_present boolean NOT NULL DEFAULT false,
  citation_urls jsonb,  -- array of {url, domain, anchorText, isOwnDomain, isCompetitor}
  raw_snippet text,
  tested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prompt_results_prompt ON prompt_results (prompt_id);
CREATE INDEX idx_prompt_results_domain ON prompt_results (domain, tested_at DESC);
CREATE INDEX idx_prompt_results_tested ON prompt_results (tested_at DESC);

-- RLS: service role only (matches existing pattern)
ALTER TABLE monitored_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on monitored_prompts"
  ON monitored_prompts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on prompt_results"
  ON prompt_results FOR ALL
  USING (auth.role() = 'service_role');
