-- Track AI-generated content pages for usage limits and history
CREATE TABLE IF NOT EXISTS generated_content_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  domain          text NOT NULL,
  topic           text NOT NULL,
  title           text NOT NULL,
  slug            text NOT NULL,
  word_count      integer NOT NULL DEFAULT 0,
  content_markdown text,
  faq_schema      text,
  html_head       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_content_pages_user ON generated_content_pages (user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_pages_domain ON generated_content_pages (user_id, domain);
CREATE INDEX IF NOT EXISTS idx_generated_content_pages_month ON generated_content_pages (user_id, created_at);

ALTER TABLE generated_content_pages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN CREATE POLICY "Service role full access" ON generated_content_pages FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
