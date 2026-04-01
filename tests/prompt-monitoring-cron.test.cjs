require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');

const cronMonitorRoute = require('../src/app/api/cron/monitor/route.ts');
const { mockPromptMonitoring } = require('../src/lib/services/mock-prompt-monitoring.ts');

test('cron monitor runs prompt monitoring and persists prompt results', async () => {
  const originalSecret = process.env.MONITORING_SECRET;
  const originalMode = process.env.CRON_PROMPT_MONITORING_MODE;
  process.env.MONITORING_SECRET = 'test-monitor-secret';
  process.env.CRON_PROMPT_MONITORING_MODE = 'inline';

  const domain = `cron-${Date.now()}.example.com`;
  const userId = `user-${Date.now()}`;

  await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'What are the best STEM career programs for high school girls?',
    category: 'industry',
    industry: 'Education',
    active: true,
  });

  try {
    const response = await cronMonitorRoute.GET(new NextRequest('http://localhost/api/cron/monitor', {
      headers: { authorization: 'Bearer test-monitor-secret' },
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.ok(payload.promptMonitoring.promptsChecked > 0);
    assert.equal(payload.promptMonitoring.promptErrors, 0);
    assert.ok(payload.promptMonitoring.engineCallsThisRun > 0);
    assert.ok(payload.promptMonitoring.successfulEngineCallsThisRun > 0);
    assert.ok(payload.promptMonitoring.runtimeBudgetMs > 0);
    assert.ok(payload.durationMs >= 0);

    const results = await mockPromptMonitoring.listPromptResults(domain, 20, userId);
    assert.ok(results.length > 0);
  } finally {
    if (originalSecret === undefined) {
      delete process.env.MONITORING_SECRET;
    } else {
      process.env.MONITORING_SECRET = originalSecret;
    }
    if (originalMode === undefined) {
      delete process.env.CRON_PROMPT_MONITORING_MODE;
    } else {
      process.env.CRON_PROMPT_MONITORING_MODE = originalMode;
    }
  }
});

test('cron monitor queues prompt monitoring in background mode', async () => {
  const originalSecret = process.env.MONITORING_SECRET;
  const originalMode = process.env.CRON_PROMPT_MONITORING_MODE;
  process.env.MONITORING_SECRET = 'test-monitor-secret';
  process.env.CRON_PROMPT_MONITORING_MODE = 'background';

  const domain = `cron-queued-${Date.now()}.example.com`;
  const userId = `user-bg-${Date.now()}`;

  await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'What mentorship programs help girls get started in STEM?',
    category: 'industry',
    industry: 'Education',
    active: true,
  });

  try {
    const response = await cronMonitorRoute.GET(new NextRequest('http://localhost/api/cron/monitor', {
      headers: { authorization: 'Bearer test-monitor-secret' },
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.promptMonitoring.mode, 'background');
    assert.equal(payload.promptMonitoring.queued, true);
    assert.equal(payload.promptMonitoring.promptsChecked, 0);
  } finally {
    if (originalSecret === undefined) {
      delete process.env.MONITORING_SECRET;
    } else {
      process.env.MONITORING_SECRET = originalSecret;
    }
    if (originalMode === undefined) {
      delete process.env.CRON_PROMPT_MONITORING_MODE;
    } else {
      process.env.CRON_PROMPT_MONITORING_MODE = originalMode;
    }
  }
});
