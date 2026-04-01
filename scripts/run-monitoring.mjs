#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveMonitoringConfig(overrides = {}, env = process.env) {
  const appUrl = String(overrides.appUrl ?? env.APP_URL ?? env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  const monitoringSecret = String(overrides.monitoringSecret ?? env.MONITORING_SECRET ?? '');
  const requestTimeoutMs = parsePositiveInt(overrides.requestTimeoutMs ?? env.MONITORING_REQUEST_TIMEOUT_MS, 285_000);

  if (!appUrl || !monitoringSecret) {
    throw new Error('Missing APP_URL/NEXT_PUBLIC_APP_URL or MONITORING_SECRET environment variables.');
  }

  return {
    appUrl,
    monitoringSecret,
    requestTimeoutMs,
  };
}

export function getMonitoringConfig(env = process.env) {
  return resolveMonitoringConfig({}, env);
}

export async function runMonitoring(options = {}) {
  const { appUrl, monitoringSecret, requestTimeoutMs } = resolveMonitoringConfig(options);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(`${appUrl}/api/cron/monitor`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${monitoringSecret}`,
      },
      signal: controller.signal,
    }).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Monitoring request timed out after ${requestTimeoutMs}ms`);
      }

      throw error;
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Monitoring failed with status ${res.status}: ${text}`);
    }

    return {
      data: await res.json(),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const { appUrl } = getMonitoringConfig();
  console.log(`[Monitoring] Triggering re-scan at ${appUrl}/api/cron/monitor`);

  const { data, durationMs } = await runMonitoring();
  console.log(`[Monitoring] Success in ${durationMs}ms:`, JSON.stringify(data, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[Monitoring] Unexpected error:', err);
    process.exit(1);
  });
}
