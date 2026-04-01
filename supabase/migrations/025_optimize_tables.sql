-- AEO Action Center tables
-- Spec: docs/superpowers/specs/2026-03-30-aeo-action-center-design.md

-- 1. Content Studio items (brief -> outline -> draft pipeline)
CREATE TABLE IF NOT EXISTS content_studio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  target_prompt_id UUID REFERENCES monitored_prompts(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('comparison', 'howto', 'definition', 'listicle', 'faq', 'case_study')),
  status TEXT NOT NULL DEFAULT 'opportunity' CHECK (status IN ('opportunity', 'brief', 'outline', 'draft', 'published')),
  title TEXT,
  brief_json JSONB,
  outline_json JSONB,
  draft_html TEXT,
  draft_markdown TEXT,
  meta_title TEXT,
  meta_description TEXT,
  schema_json JSONB,
  word_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_studio_user_domain ON content_studio_items(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_content_studio_usage ON content_studio_items(user_id, created_at);

ALTER TABLE content_studio_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON content_studio_items FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 2. Source ecosystem cache
CREATE TABLE IF NOT EXISTS source_ecosystem_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  analysis_json JSONB NOT NULL,
  sources_count INT NOT NULL DEFAULT 0,
  own_site_pct NUMERIC(5,2) DEFAULT 0,
  competitor_pct NUMERIC(5,2) DEFAULT 0,
  third_party_pct NUMERIC(5,2) DEFAULT 0,
  top_gaps_json JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  prompt_results_hash TEXT,
  UNIQUE(user_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_source_cache_computed ON source_ecosystem_cache(user_id, computed_at DESC);

ALTER TABLE source_ecosystem_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON source_ecosystem_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 3. Optimization actions (trackable off-page checklist)
CREATE TABLE IF NOT EXISTS optimization_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('review_platform', 'community', 'pr_media', 'directory', 'technical', 'content_distribution')),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('gap_analysis', 'scan_fix', 'prompt_insight', 'best_practice')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  estimated_impact TEXT CHECK (estimated_impact IN ('high', 'medium', 'low')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain, source, title)
);

CREATE INDEX IF NOT EXISTS idx_opt_actions_user_domain ON optimization_actions(user_id, domain);

ALTER TABLE optimization_actions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON optimization_actions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 4. Brand positioning (user-defined)
CREATE TABLE IF NOT EXISTS brand_positioning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  differentiators_json JSONB,
  target_audience TEXT,
  category TEXT,
  negative_associations_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);

ALTER TABLE brand_positioning ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON brand_positioning FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 5. Brand consistency cache
CREATE TABLE IF NOT EXISTS brand_consistency_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  consistency_score INT NOT NULL DEFAULT 0,
  engine_descriptions_json JSONB,
  flags_json JSONB,
  recommendations_json JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);

ALTER TABLE brand_consistency_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON brand_consistency_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
