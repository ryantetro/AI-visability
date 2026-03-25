-- RPC function to atomically increment scans_used for a user
-- Called by src/lib/user-profile.ts via supabase.rpc('increment_scans_used', ...)

CREATE OR REPLACE FUNCTION increment_scans_used(user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only service_role may call this function
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'permission denied: only service_role may increment scan count';
  END IF;

  UPDATE user_profiles
  SET scans_used = scans_used + 1,
      updated_at = now()
  WHERE id = user_id;
END;
$$;
