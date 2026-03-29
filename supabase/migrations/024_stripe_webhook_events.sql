-- 024: Durable Stripe webhook idempotency tracking

create table if not exists stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processing_status text not null default 'processing'
    check (processing_status in ('processing', 'processed', 'failed')),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stripe_webhook_events_status
  on stripe_webhook_events (processing_status, updated_at desc);
