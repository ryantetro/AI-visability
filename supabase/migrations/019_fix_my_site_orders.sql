-- 019: Fix My Site service orders
-- One-time $499 service where the AISO team optimizes AI visibility files

create table if not exists fix_my_site_orders (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 text not null references user_profiles(id) on delete cascade,
  domain                  text not null,
  status                  text not null default 'ordered'
                            check (status in ('ordered', 'in_progress', 'delivered', 'refunded')),
  notes                   text,
  files_requested         text[] default '{}',
  stripe_session_id       text,
  stripe_payment_intent_id text,
  amount_cents            int not null default 49900,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz,
  completed_at            timestamptz
);

create index if not exists idx_fms_orders_user on fix_my_site_orders (user_id);
create index if not exists idx_fms_orders_status on fix_my_site_orders (status);
create index if not exists idx_fms_orders_stripe_session on fix_my_site_orders (stripe_session_id);

alter table fix_my_site_orders enable row level security;

do $$ begin
  begin create policy "Service role full access" on fix_my_site_orders for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role'); exception when duplicate_object then null; end;
end $$;
