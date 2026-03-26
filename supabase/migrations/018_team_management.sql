-- 018: Team Management
-- Adds teams, team_members, and team_invitations tables for multi-seat support.

-- 1. TEAMS
create table if not exists teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   text not null references user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teams_owner on teams (owner_id);

-- 2. TEAM MEMBERS
create table if not exists team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references teams(id) on delete cascade,
  user_id   text not null references user_profiles(id) on delete cascade,
  role      text not null default 'member'
              check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

create index if not exists idx_team_members_team on team_members (team_id);
-- Enforce one-team-per-user at the DB level (prevents race conditions)
create unique index if not exists idx_team_members_single_team on team_members (user_id);

-- 3. TEAM INVITATIONS
create table if not exists team_invitations (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  email       text not null,
  token       text not null unique,
  invited_by  text not null references user_profiles(id) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'revoked')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists idx_team_invitations_team on team_invitations (team_id);
create index if not exists idx_team_invitations_token on team_invitations (token);
create index if not exists idx_team_invitations_email on team_invitations (email);

-- RLS
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invitations enable row level security;

-- Service role bypass policies
do $$ begin
  begin create policy "Service role full access" on teams for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on team_members for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role'); exception when duplicate_object then null; end;
  begin create policy "Service role full access" on team_invitations for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role'); exception when duplicate_object then null; end;
end $$;
