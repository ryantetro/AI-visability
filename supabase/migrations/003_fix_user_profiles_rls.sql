-- Fix user_profiles RLS: restrict to service_role only
drop policy if exists "service_role_all" on user_profiles;
create policy "service_role_full_access" on user_profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
