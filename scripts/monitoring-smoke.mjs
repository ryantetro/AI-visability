#!/usr/bin/env node

import { runMonitoring } from './run-monitoring.mjs';

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function assertValidPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Monitoring smoke check expected a JSON object response.');
  }

  if (!Array.isArray(payload.rescans)) {
    throw new Error('Monitoring smoke check expected payload.rescans to be an array.');
  }

  if (!payload.promptMonitoring || typeof payload.promptMonitoring !== 'object') {
    throw new Error('Monitoring smoke check expected payload.promptMonitoring to be present.');
  }

  if (typeof payload.promptMonitoring.engineCallBudget !== 'number') {
    throw new Error('Monitoring smoke check expected promptMonitoring.engineCallBudget to be a number.');
  }

  if (typeof payload.timestamp !== 'string') {
    throw new Error('Monitoring smoke check expected payload.timestamp to be an ISO timestamp.');
  }
}

async function main() {
  const expectedMaxMs = parsePositiveInt(process.env.MONITORING_EXPECT_MAX_MS, 90_000);
  const requestTimeoutMs = parsePositiveInt(
    process.env.MONITORING_REQUEST_TIMEOUT_MS,
    Math.max(120_000, expectedMaxMs + 30_000),
  );

  const { data, durationMs } = await runMonitoring({ requestTimeoutMs });
  assertValidPayload(data);

  if (durationMs > expectedMaxMs) {
    throw new Error(`Monitoring smoke check exceeded budget: ${durationMs}ms > ${expectedMaxMs}ms`);
  }

  console.log('[Monitoring Smoke] Success:', JSON.stringify({
    durationMs,
    rescans: data.rescans.length,
    checked: data.checked,
    promptMonitoring: data.promptMonitoring,
    timestamp: data.timestamp,
  }, null, 2));
}

main().catch((error) => {
  console.error('[Monitoring Smoke] Failed:', error);
  process.exit(1);
});
