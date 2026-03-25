#!/usr/bin/env node

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
const MONITORING_SECRET = process.env.MONITORING_SECRET;

const normalizedAppUrl = APP_URL ? APP_URL.replace(/\/$/, '') : '';

if (!normalizedAppUrl || !MONITORING_SECRET) {
  console.error('Missing APP_URL/NEXT_PUBLIC_APP_URL or MONITORING_SECRET environment variables.');
  process.exit(1);
}

async function main() {
  console.log(`[Monitoring] Triggering re-scan at ${normalizedAppUrl}/api/cron/monitor`);

  const res = await fetch(`${normalizedAppUrl}/api/cron/monitor`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${MONITORING_SECRET}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Monitoring] Failed with status ${res.status}: ${text}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`[Monitoring] Success:`, JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error('[Monitoring] Unexpected error:', err);
  process.exit(1);
});
