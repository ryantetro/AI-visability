-- Add selected_regions column to user_domains for region targeting
ALTER TABLE user_domains ADD COLUMN IF NOT EXISTS selected_regions text[] DEFAULT NULL;
