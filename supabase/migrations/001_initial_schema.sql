-- ============================================================
-- AISO Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. SCANS — core scan jobs
create table if not exists scans (
  id            text primary key,
  url           text not null,
  normalized_url text not null,
  status        text not null default 'pending'
                  check (status in ('pending','crawling','scoring','complete','failed')),
  progress      jsonb not null default '{}'::jsonb,
  enrichments   jsonb,
  email         text,
  paid          boolean not null default false,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,
  crawl_data    jsonb,
  score_result  jsonb,
  generated_files jsonb,
  mention_summary jsonb
);

create index if not exists idx_scans_normalized_url on scans (normalized_url);
create index if not exists idx_scans_status on scans (status);
create index if not exists idx_scans_email on scans (email);
create index if not exists idx_scans_completed_at on scans (completed_at desc nulls last);

-- 2. DOMAIN VERIFICATIONS — ownership proof for public profiles
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

-- 3. PUBLIC PROFILES — public score visibility, badges, leaderboard
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

-- 4. MONITORING DOMAINS — score-drop alerts
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

-- 5. ROW LEVEL SECURITY (RLS)
-- These tables are accessed server-side with the service role key,
-- so we enable RLS but only add a policy for service_role access.
-- This prevents any accidental anon/public access.

alter table scans enable row level security;
alter table domain_verifications enable row level security;
alter table public_profiles enable row level security;
alter table monitoring_domains enable row level security;

-- Allow full access for service_role (server-side API routes)
create policy "Service role full access" on scans
  for all using (auth.role() = 'service_role');

create policy "Service role full access" on domain_verifications
  for all using (auth.role() = 'service_role');

create policy "Service role full access" on public_profiles
  for all using (auth.role() = 'service_role');

create policy "Service role full access" on monitoring_domains
  for all using (auth.role() = 'service_role');
