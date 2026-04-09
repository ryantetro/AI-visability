-- Add any columns to content_studio_items that may be missing
-- if the table was created from an earlier schema version.
-- Safe to run multiple times (IF NOT EXISTS / check).

DO $$
BEGIN
  -- topic
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'topic') THEN
    ALTER TABLE content_studio_items ADD COLUMN topic text;
  END IF;

  -- domain
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'domain') THEN
    ALTER TABLE content_studio_items ADD COLUMN domain text NOT NULL DEFAULT '';
  END IF;

  -- selected_prompts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'selected_prompts') THEN
    ALTER TABLE content_studio_items ADD COLUMN selected_prompts text[];
  END IF;

  -- audience_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'audience_id') THEN
    ALTER TABLE content_studio_items ADD COLUMN audience_id uuid REFERENCES content_studio_audiences(id) ON DELETE SET NULL;
  END IF;

  -- tone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'tone') THEN
    ALTER TABLE content_studio_items ADD COLUMN tone text DEFAULT 'professional';
  END IF;

  -- length
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'length') THEN
    ALTER TABLE content_studio_items ADD COLUMN length text DEFAULT 'medium';
  END IF;

  -- perspective
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'perspective') THEN
    ALTER TABLE content_studio_items ADD COLUMN perspective text DEFAULT 'second';
  END IF;

  -- sections
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'sections') THEN
    ALTER TABLE content_studio_items ADD COLUMN sections jsonb DEFAULT '[]';
  END IF;

  -- cta_text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'cta_text') THEN
    ALTER TABLE content_studio_items ADD COLUMN cta_text text;
  END IF;

  -- additional_instructions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'additional_instructions') THEN
    ALTER TABLE content_studio_items ADD COLUMN additional_instructions text[];
  END IF;

  -- brief_markdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'brief_markdown') THEN
    ALTER TABLE content_studio_items ADD COLUMN brief_markdown text;
  END IF;

  -- article_markdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'article_markdown') THEN
    ALTER TABLE content_studio_items ADD COLUMN article_markdown text;
  END IF;

  -- workflow_progress
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_studio_items' AND column_name = 'workflow_progress') THEN
    ALTER TABLE content_studio_items ADD COLUMN workflow_progress jsonb;
  END IF;
  -- Drop stale CHECK constraint on content_type if it exists.
  -- The app validates content_type in code; a DB constraint from an
  -- earlier schema may not include all current types.
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'content_studio_items'
      AND constraint_name = 'content_studio_items_content_type_check'
  ) THEN
    ALTER TABLE content_studio_items DROP CONSTRAINT content_studio_items_content_type_check;
  END IF;

  -- Drop stale CHECK constraint on status if it exists.
  -- The pipeline uses statuses like brief_generating, article_generating,
  -- brief_ready, article_ready that may not be in the original constraint.
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'content_studio_items'
      AND constraint_name = 'content_studio_items_status_check'
  ) THEN
    ALTER TABLE content_studio_items DROP CONSTRAINT content_studio_items_status_check;
  END IF;
END $$;
