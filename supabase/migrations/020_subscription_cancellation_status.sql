-- 020: Track scheduled subscription cancellations so the app can show
-- canceled-but-still-active access windows in billing surfaces.

alter table user_profiles
  add column if not exists plan_cancel_at_period_end boolean not null default false;
