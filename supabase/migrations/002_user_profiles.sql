-- User profiles for per-account scan limits
create table if not exists user_profiles (
  id              text primary key,        -- Supabase auth user ID
  email           text not null unique,
  plan            text not null default 'free',
  scans_used      integer not null default 0,
  free_scan_limit integer not null default 3,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Enable RLS
alter table user_profiles enable row level security;

-- Allow service_role full access
create policy "service_role_all" on user_profiles
  for all
  using (true)
  with check (true);
