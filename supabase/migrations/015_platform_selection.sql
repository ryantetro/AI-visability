-- Add platform selection to user_domains
-- Stores which AI platforms a user has selected for each domain
-- NULL means "use all available for their plan tier" (default behavior)
ALTER TABLE user_domains
  ADD COLUMN IF NOT EXISTS selected_platforms text[] DEFAULT NULL;
