-- Per-domain tracking keys for customer-installed AI bot middleware snippets
create table if not exists site_tracking_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references user_profiles(id) on delete cascade,
  domain       text not null,
  site_key     text not null unique,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  unique(user_id, domain)
);

create index if not exists idx_site_tracking_keys_key on site_tracking_keys (site_key);

alter table site_tracking_keys enable row level security;

do $$ begin
  begin
    create policy "Service role full access on site_tracking_keys"
      on site_tracking_keys for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  exception
    when duplicate_object then null;
  end;
end $$;
