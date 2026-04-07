-- Content Studio tables
-- Audiences must be created first (referenced by items)

CREATE TABLE IF NOT EXISTS content_studio_audiences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  usage_count     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_audiences_user ON content_studio_audiences(user_id);

ALTER TABLE content_studio_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_audiences_select" ON content_studio_audiences FOR SELECT USING (true);
CREATE POLICY "cs_audiences_insert" ON content_studio_audiences FOR INSERT WITH CHECK (true);
CREATE POLICY "cs_audiences_update" ON content_studio_audiences FOR UPDATE USING (true);
CREATE POLICY "cs_audiences_delete" ON content_studio_audiences FOR DELETE USING (true);

-- Content Studio items (briefs / articles)

CREATE TABLE IF NOT EXISTS content_studio_items (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  text NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain                   text NOT NULL,
  title                    text NOT NULL,
  content_type             text NOT NULL DEFAULT 'blog_post',
  status                   text NOT NULL DEFAULT 'draft',
  topic                    text,
  selected_prompts         text[],
  audience_id              uuid REFERENCES content_studio_audiences(id) ON DELETE SET NULL,
  tone                     text DEFAULT 'professional',
  length                   text DEFAULT 'medium',
  perspective              text DEFAULT 'second',
  sections                 jsonb DEFAULT '[]',
  cta_text                 text,
  additional_instructions  text[],
  brief_markdown           text,
  article_markdown         text,
  workflow_progress        jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_items_user ON content_studio_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_items_domain ON content_studio_items(domain);
CREATE INDEX IF NOT EXISTS idx_cs_items_status ON content_studio_items(status);

ALTER TABLE content_studio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_items_select" ON content_studio_items FOR SELECT USING (true);
CREATE POLICY "cs_items_insert" ON content_studio_items FOR INSERT WITH CHECK (true);
CREATE POLICY "cs_items_update" ON content_studio_items FOR UPDATE USING (true);
CREATE POLICY "cs_items_delete" ON content_studio_items FOR DELETE USING (true);
