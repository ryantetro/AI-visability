create extension if not exists pgcrypto;

create table if not exists scans (
  id uuid primary key,
  url text not null,
  normalized_url text not null,
  status text not null,
  progress jsonb not null default '{}'::jsonb,
  enrichments jsonb,
  email text,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  crawl_data jsonb,
  score_result jsonb,
  generated_files jsonb
);

create index if not exists scans_normalized_url_idx on scans(normalized_url);
create index if not exists scans_status_idx on scans(status);
create index if not exists scans_created_at_idx on scans(created_at desc);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plan text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  created_at timestamptz not null default now()
);

create table if not exists monitoring_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  domain text not null,
  last_scan_id uuid,
  scan_id uuid,
  url text,
  email text,
  alert_threshold integer not null default 5,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scan_history (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  scan_id uuid not null,
  scores_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists domain_verifications (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  scan_id uuid,
  url text,
  email text,
  verification_token text not null,
  status text not null default 'pending',
  method text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public_profiles (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  domain text not null,
  enabled boolean not null default false,
  badge_enabled boolean not null default false,
  leaderboard_enabled boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table monitoring_domains add column if not exists scan_id uuid;
alter table monitoring_domains add column if not exists url text;
alter table monitoring_domains add column if not exists email text;
alter table monitoring_domains add column if not exists status text not null default 'active';
alter table monitoring_domains add column if not exists updated_at timestamptz not null default now();

alter table domain_verifications add column if not exists scan_id uuid;
alter table domain_verifications add column if not exists url text;
alter table domain_verifications add column if not exists email text;

alter table public_profiles add column if not exists verified boolean not null default false;
alter table public_profiles add column if not exists updated_at timestamptz not null default now();
