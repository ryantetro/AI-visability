-- Add Stripe-related fields to user_profiles
alter table user_profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists plan_updated_at timestamptz;
