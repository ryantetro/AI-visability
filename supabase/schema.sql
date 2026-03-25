-- ============================================================
-- AISO Complete Database Schema (consolidated reference)
-- Run this in the Supabase SQL Editor to create everything at once,
-- or use the individual files in supabase/migrations/ sequentially.
-- ============================================================

-- 1. SCANS — core scan jobs
create table if not exists scans (
  id             text primary key,
  url            text not null,
  normalized_url text not null,
  status         text not null default 'pending'
                   check (status in ('pending','crawling','scoring','complete','failed')),
  progress       jsonb not null default '{}'::jsonb,
  enrichments    jsonb,
  email          text,
  paid           boolean not null default false,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,
  crawl_data     jsonb,
  score_result   jsonb,
  generated_files jsonb,
  mention_summary jsonb
);

create index if not exists idx_scans_normalized_url on scans (normalized_url);
create index if not exists idx_scans_status on scans (status);
create index if not exists idx_scans_email on scans (email);
create index if not exists idx_scans_completed_at on scans (completed_at desc nulls last);

-- 2. USER PROFILES — per-account scan limits
create table if not exists user_profiles (
  id              text primary key,
  email           text not null unique,
  plan            text not null default 'free',
  scans_used      integer not null default 0,
  free_scan_limit integer not null default 3,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan_expires_at timestamptz,
  plan_updated_at timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 3. DOMAIN VERIFICATIONS — ownership proof for public profiles
create table if not exists domain_verifications (
  id                 text primary key,
  domain             text not null unique,
  url                text,
  scan_id            text,
  email              text,
  verification_token text not null,
  status             text not null default 'pending'
                       check (status in ('pending','verified')),
  method             text check (method in ('meta-tag','well-known')),
  created_at         timestamptz not null default now(),
  verified_at        timestamptz
);

create index if not exists idx_domain_verifications_domain on domain_verifications (domain);

-- 4. PUBLIC PROFILES — public score visibility, badges, leaderboard
create table if not exists public_profiles (
  id                   text primary key,
  scan_id              text not null unique,
  domain               text not null unique,
  enabled              boolean not null default true,
  badge_enabled        boolean not null default true,
  leaderboard_enabled  boolean not null default false,
  verified             boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_public_profiles_domain on public_profiles (domain);

-- 5. MONITORING DOMAINS — score-drop alerts
create table if not exists monitoring_domains (
  id              text primary key,
  domain          text not null,
  url             text,
  scan_id         text,
  email           text,
  alert_threshold integer not null default 5,
  status          text not null default 'active'
                    check (status in ('active','paused')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_monitoring_domains_email on monitoring_domains (email);
create index if not exists idx_monitoring_domains_domain on monitoring_domains (domain);

-- 6. MONITORED PROMPTS — recurring AI engine prompt tracking
create table if not exists monitored_prompts (
  id          uuid primary key default gen_random_uuid(),
  domain      text not null,
  user_id     uuid not null,
  prompt_text text not null,
  category    text not null default 'custom',
  industry    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_monitored_prompts_domain on monitored_prompts (domain);
create index if not exists idx_monitored_prompts_user on monitored_prompts (user_id);
create index if not exists idx_monitored_prompts_active on monitored_prompts (domain, active) where active = true;

-- 7. PROMPT RESULTS — individual engine test results
create table if not exists prompt_results (
  id               uuid primary key default gen_random_uuid(),
  prompt_id        uuid not null references monitored_prompts(id) on delete cascade,
  domain           text not null,
  engine           text not null,
  mentioned        boolean not null default false,
  position         integer,
  sentiment        text,
  citation_present boolean not null default false,
  citation_urls    jsonb,
  raw_snippet      text,
  tested_at        timestamptz not null default now()
);

create index if not exists idx_prompt_results_prompt on prompt_results (prompt_id);
create index if not exists idx_prompt_results_domain on prompt_results (domain, tested_at desc);
create index if not exists idx_prompt_results_tested on prompt_results (tested_at desc);

-- 8. COMPETITOR APPEARANCES — competitor tracking in AI answers
create table if not exists competitor_appearances (
  id                uuid primary key default gen_random_uuid(),
  domain            text not null,
  competitor        text not null,
  competitor_domain text,
  engine            text not null,
  prompt_id         uuid references monitored_prompts(id) on delete set null,
  position          integer,
  co_mentioned      boolean not null default false,
  week_start        date not null default date_trunc('week', now())::date,
  detected_at       timestamptz not null default now()
);

create index if not exists idx_competitor_appearances_domain on competitor_appearances (domain, week_start desc);
create index if not exists idx_competitor_appearances_competitor on competitor_appearances (domain, competitor);
create index if not exists idx_competitor_appearances_engine on competitor_appearances (domain, engine);
create index if not exists idx_competitor_appearances_prompt on competitor_appearances (prompt_id);

-- 9. AI CRAWLER VISITS — bot visit logging
create table if not exists ai_crawler_visits (
  id            uuid primary key default gen_random_uuid(),
  domain        text not null,
  bot_name      text not null,
  bot_category  text not null,
  page_path     text not null,
  user_agent    text,
  response_code integer,
  visited_at    timestamptz not null default now()
);

create index if not exists idx_crawler_visits_domain on ai_crawler_visits (domain, visited_at desc);
create index if not exists idx_crawler_visits_bot on ai_crawler_visits (domain, bot_name);
create index if not exists idx_crawler_visits_date on ai_crawler_visits (visited_at desc);

-- 10. USER DOMAINS — persistent domain tracking per user
create table if not exists user_domains (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references user_profiles(id) on delete cascade,
  domain     text not null,
  url        text,
  hidden     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, domain)
);

create index if not exists idx_user_domains_user on user_domains (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- All tables accessed server-side with service_role key.
-- RLS prevents accidental anon/public access.
-- ============================================================

alter table scans enable row level security;
alter table user_profiles enable row level security;
alter table domain_verifications enable row level security;
alter table public_profiles enable row level security;
alter table monitoring_domains enable row level security;
alter table monitored_prompts enable row level security;
alter table prompt_results enable row level security;
alter table competitor_appearances enable row level security;
alter table ai_crawler_visits enable row level security;
alter table user_domains enable row level security;

-- Service role bypass policies
do $$ begin
  -- Use CREATE ... IF NOT EXISTS pattern via exception handling
  begin create policy "Service role full access" on scans for all using (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on user_profiles for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on domain_verifications for all using (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on public_profiles for all using (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on monitoring_domains for all using (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on monitored_prompts for all using (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on prompt_results for all using (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on competitor_appearances for all using (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on ai_crawler_visits for all using (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on user_domains for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role'); exception when duplicate_object then null; end;
end $$;

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Atomically increment scan count for a user
create or replace function increment_scans_used(user_id text)
returns void
language plpgsql
security definer
as $$
begin
  -- Only service_role may call this function
  if auth.role() != 'service_role' then
    raise exception 'permission denied: only service_role may increment scan count';
  end if;

  update user_profiles
  set scans_used = scans_used + 1,
      updated_at = now()
  where id = user_id;
end;
$$;

-- 11. USER COMPETITORS — competitor tracking with full scans
create table if not exists user_competitors (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null references user_profiles(id) on delete cascade,
  domain           text not null,
  competitor_url   text not null,
  competitor_domain text not null,
  scan_id          text references scans(id) on delete set null,
  status           text not null default 'pending'
                     check (status in ('pending','scanning','complete','failed')),
  added_at         timestamptz not null default now(),
  last_scanned_at  timestamptz,
  unique(user_id, domain, competitor_domain)
);

create index if not exists idx_uc_user_domain on user_competitors (user_id, domain);

alter table user_competitors enable row level security;

do $$ begin
  begin create policy "Service role full access" on user_competitors for all using (auth.role() = 'service_role'); exception when duplicate_object then null; end;
end $$;
