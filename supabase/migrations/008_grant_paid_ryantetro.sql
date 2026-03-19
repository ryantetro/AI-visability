-- Grant paid (starter) access to ryantetro@gmail.com for dashboard view
-- Run in Supabase SQL Editor if needed

-- 1. Upgrade user plan to starter
UPDATE user_profiles
SET plan = 'pro_monthly', updated_at = now()
WHERE LOWER(email) = 'ryantetro@gmail.com';

-- 2. Mark all scans owned by this email as paid (unlocks report features)
UPDATE scans
SET paid = true
WHERE LOWER(email) = 'ryantetro@gmail.com';
