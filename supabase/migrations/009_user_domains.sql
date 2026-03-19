-- User domains: persistent domain tracking per user
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

-- RLS
alter table user_domains enable row level security;

do $$ begin
  begin create policy "Service role full access" on user_domains for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role'); exception when duplicate_object then null; end;
end $$;
