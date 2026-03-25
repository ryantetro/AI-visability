ALTER TABLE monitoring_domains
  ADD COLUMN IF NOT EXISTS opportunity_alerts_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE monitoring_domains
  ADD COLUMN IF NOT EXISTS last_opportunity_alert_at timestamptz;
