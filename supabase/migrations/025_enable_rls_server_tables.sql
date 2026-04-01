-- 025_enable_rls_server_tables.sql
-- Restrict internal-only tables exposed through the public schema.

alter table public.workspace_trim_log enable row level security;
alter table public.stripe_webhook_events enable row level security;

do $$
begin
  begin
    create policy "Service role full access on workspace_trim_log"
      on public.workspace_trim_log
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  exception when duplicate_object then
    null;
  end;

  begin
    create policy "Service role full access on stripe_webhook_events"
      on public.stripe_webhook_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  exception when duplicate_object then
    null;
  end;
end
$$;
