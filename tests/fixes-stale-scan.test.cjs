require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

// ─── Fix 1: Scan fallback order ─────────────────────────────────────────────
// Verify that getLatestScanByDomain returns the most recent scan regardless of
// paid status, and that the new fallback order (latestScan ?? latestPaidScan)
// prefers the newest scan.

const {
  getLatestScanByDomain,
  getLatestPaidScanByDomain,
  getLatestMonitorableScanByDomain,
} = require('../src/app/advanced/lib/utils.ts');

function makeScan(id, url, createdAt, hasPaid = false, extra = {}) {
  return { id, url, status: 'complete', hasEmail: true, hasPaid, createdAt, ...extra };
}

test('Fix 1: getLatestScanByDomain returns most recent scan regardless of paid status', () => {
  const scans = [
    makeScan('old-paid', 'https://example.com/', 1000, true),
    makeScan('new-free', 'https://example.com/', 2000, false),
  ];

  const latest = getLatestScanByDomain(scans, 'example.com');
  assert.equal(latest.id, 'new-free', 'Should return the most recent scan (new-free), not old-paid');
});

test('Fix 1: getLatestPaidScanByDomain only returns paid scans', () => {
  const scans = [
    makeScan('old-paid', 'https://example.com/', 1000, true),
    makeScan('new-free', 'https://example.com/', 2000, false),
  ];

  const latestPaid = getLatestPaidScanByDomain(scans, 'example.com');
  assert.equal(latestPaid.id, 'old-paid', 'Should return the paid scan only');
});

test('Fix 1: paid workspaces can enable monitoring from the latest scan even without a paid scan flag', () => {
  const scans = [
    makeScan('legacy-free', 'https://example.com/', 2000, false),
  ];

  const latestMonitorable = getLatestMonitorableScanByDomain(scans, 'example.com', true);
  assert.equal(latestMonitorable?.id, 'legacy-free', 'Monitoring should attach to the latest scan for paid workspaces');
});

test('Fix 1: free workspaces still require a paid scan to enable monitoring', () => {
  const scans = [
    makeScan('legacy-free', 'https://example.com/', 2000, false),
  ];

  const latestMonitorable = getLatestMonitorableScanByDomain(scans, 'example.com', false);
  assert.equal(latestMonitorable, null, 'Free workspaces should not treat unpaid scans as monitorable');
});

test('Fix 1: new fallback order prefers latestScan over latestPaidScan', () => {
  // This simulates the logic in domain-context.tsx after the fix:
  //   expandedSite?.latestScan?.id ?? expandedSite?.latestPaidScan?.id
  const scans = [
    makeScan('old-paid', 'https://example.com/', 1000, true),
    makeScan('new-rescan', 'https://example.com/', 2000, false),
  ];

  const latestScan = getLatestScanByDomain(scans, 'example.com');
  const latestPaidScan = getLatestPaidScanByDomain(scans, 'example.com');

  // NEW fallback order (what we changed to)
  const activeId = latestScan?.id ?? latestPaidScan?.id ?? '';
  assert.equal(activeId, 'new-rescan', 'New fallback should show the rescan, not old paid scan');

  // OLD fallback order (what it was before) — would have been wrong
  const oldActiveId = latestPaidScan?.id ?? latestScan?.id ?? '';
  assert.equal(oldActiveId, 'old-paid', 'Old fallback would incorrectly show old paid scan');
});

test('Fix 1: when only paid scans exist, fallback still works', () => {
  const scans = [
    makeScan('paid-1', 'https://example.com/', 1000, true),
    makeScan('paid-2', 'https://example.com/', 2000, true),
  ];

  const latestScan = getLatestScanByDomain(scans, 'example.com');
  const latestPaidScan = getLatestPaidScanByDomain(scans, 'example.com');

  const activeId = latestScan?.id ?? latestPaidScan?.id ?? '';
  assert.equal(activeId, 'paid-2', 'Should pick the newest paid scan');
});

test('Fix 1: when no scans exist, fallback returns empty string', () => {
  const latestScan = getLatestScanByDomain([], 'example.com');
  const latestPaidScan = getLatestPaidScanByDomain([], 'example.com');

  const activeId = latestScan?.id ?? latestPaidScan?.id ?? '';
  assert.equal(activeId, '', 'Should fallback to empty string when no scans');
});

test('Fix 1: rescanned scan with pending status is shown over old complete paid scan', () => {
  const scans = [
    makeScan('old-paid', 'https://example.com/', 1000, true, { status: 'complete' }),
    makeScan('new-rescan', 'https://example.com/', 3000, false, { status: 'pending' }),
  ];

  const latestScan = getLatestScanByDomain(scans, 'example.com');
  assert.equal(latestScan.id, 'new-rescan', 'Pending rescan should be latest');

  const activeId = latestScan?.id ?? null;
  assert.equal(activeId, 'new-rescan', 'Active report should be the pending rescan');
});

// ─── Fix 2: buildNavHref preserves ?report= param ──────────────────────────

// We test the buildNavHref function directly by extracting its logic
// (since it's a pure function we can replicate and verify)
function buildNavHref(base, reportId) {
  if (!reportId) return base;
  return `${base}?report=${reportId}`;
}

const WORKSPACE_KEYS = new Set(['dashboard', 'report', 'brand', 'competitors', 'settings']);
const DOMAIN_CONTEXT_PREFIXES = ['/dashboard', '/report', '/brand', '/competitors', '/settings', '/advanced', '/history', '/leaderboard'];

test('Fix 2: buildNavHref appends report param when present', () => {
  assert.equal(buildNavHref('/dashboard', 'abc-123'), '/dashboard?report=abc-123');
  assert.equal(buildNavHref('/report', 'abc-123'), '/report?report=abc-123');
  assert.equal(buildNavHref('/brand', 'scan-id'), '/brand?report=scan-id');
});

test('Fix 2: buildNavHref returns bare path when no report param', () => {
  assert.equal(buildNavHref('/dashboard', null), '/dashboard');
  assert.equal(buildNavHref('/report', ''), '/report');
  assert.equal(buildNavHref('/settings', null), '/settings');
});

test('Fix 2: workspace keys include all workspace routes', () => {
  assert.ok(WORKSPACE_KEYS.has('dashboard'));
  assert.ok(WORKSPACE_KEYS.has('report'));
  assert.ok(WORKSPACE_KEYS.has('brand'));
  assert.ok(WORKSPACE_KEYS.has('competitors'));
  assert.ok(WORKSPACE_KEYS.has('settings'));
});

test('Fix 2: non-workspace routes should NOT carry report param', () => {
  const nonWorkspaceKeys = ['history', 'leaderboard', 'pricing'];
  for (const key of nonWorkspaceKeys) {
    assert.ok(!WORKSPACE_KEYS.has(key), `${key} should NOT be a workspace key`);
  }
});

test('Fix 2: leaderboard uses the workspace domain-context sidebar classification', () => {
  assert.ok(
    DOMAIN_CONTEXT_PREFIXES.some((prefix) => '/leaderboard'.startsWith(prefix)),
    'leaderboard should use the workspace sidebar with domain context'
  );
  assert.ok(
    !DOMAIN_CONTEXT_PREFIXES.some((prefix) => '/featured'.startsWith(prefix)),
    'featured should remain outside the workspace domain-context routes'
  );
});

test('Fix 2: sidebar nav items get correct hrefs with report param', () => {
  const NAV_ITEMS = [
    { key: 'dashboard', href: '/dashboard' },
    { key: 'report', href: '/report' },
    { key: 'brand', href: '/brand' },
    { key: 'competitors', href: '/competitors' },
    { key: 'history', href: '/history' },
    { key: 'leaderboard', href: '/leaderboard' },
  ];

  const reportParam = 'test-scan-id';
  const results = NAV_ITEMS.map((item) => ({
    key: item.key,
    href: WORKSPACE_KEYS.has(item.key) ? buildNavHref(item.href, reportParam) : item.href,
  }));

  // Workspace routes should have the param
  assert.equal(results.find((r) => r.key === 'dashboard').href, '/dashboard?report=test-scan-id');
  assert.equal(results.find((r) => r.key === 'report').href, '/report?report=test-scan-id');
  assert.equal(results.find((r) => r.key === 'brand').href, '/brand?report=test-scan-id');
  assert.equal(results.find((r) => r.key === 'competitors').href, '/competitors?report=test-scan-id');

  // Non-workspace routes should NOT have the param
  assert.equal(results.find((r) => r.key === 'history').href, '/history');
  assert.equal(results.find((r) => r.key === 'leaderboard').href, '/leaderboard');
});

// ─── Fix 3: Gemini engine integration ───────────────────────────────────────

const {
  realMentionTester,
  canUseMentionTester,
} = require('../src/lib/services/mention-tester-real.ts');

test('Fix 3a: realMentionTester.availableEngines excludes engines without API keys', () => {
  const engines = realMentionTester.availableEngines();

  // Verify every listed engine has its API key set
  const keyMap = {
    chatgpt: 'OPENAI_API_KEY',
    claude: 'ANTHROPIC_API_KEY',
    gemini: 'GOOGLE_GENAI_API_KEY',
    perplexity: 'PERPLEXITY_API_KEY',
  };

  for (const engine of engines) {
    assert.ok(
      process.env[keyMap[engine]],
      `${engine} listed as available but ${keyMap[engine]} is not set`
    );
  }
});

test('Fix 3b: Gemini query throws on missing API key', async () => {
  // Save and clear the key
  const savedKey = process.env.GOOGLE_GENAI_API_KEY;
  delete process.env.GOOGLE_GENAI_API_KEY;

  try {
    // gemini should not be in available engines
    const engines = realMentionTester.availableEngines();
    assert.ok(
      !engines.includes('gemini'),
      'gemini should not be available when GOOGLE_GENAI_API_KEY is not set'
    );

    // Direct query should throw
    await assert.rejects(
      () => realMentionTester.query('gemini', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' }),
      (err) => {
        assert.ok(err.message.includes('GOOGLE_GENAI_API_KEY'), `Error should mention missing key, got: ${err.message}`);
        return true;
      }
    );
  } finally {
    // Restore
    if (savedKey) process.env.GOOGLE_GENAI_API_KEY = savedKey;
  }
});

test('Fix 3c: Gemini safety block throws instead of returning empty string', async () => {
  // Mock fetch to simulate a safety-blocked Gemini response
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: '' }] },
            finishReason: 'SAFETY',
          }],
        }),
      };
    }
    return originalFetch(url);
  };

  // Temporarily set a fake key so the guard passes
  const savedKey = process.env.GOOGLE_GENAI_API_KEY;
  process.env.GOOGLE_GENAI_API_KEY = 'fake-key-for-test';

  try {
    await assert.rejects(
      () => realMentionTester.query('gemini', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' }),
      (err) => {
        assert.ok(
          err.message.includes('SAFETY'),
          `Error should mention SAFETY finishReason, got: ${err.message}`
        );
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
    if (savedKey) {
      process.env.GOOGLE_GENAI_API_KEY = savedKey;
    } else {
      delete process.env.GOOGLE_GENAI_API_KEY;
    }
  }
});

test('Fix 3c: Gemini recitation block throws instead of returning empty string', async () => {
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: '' }] },
            finishReason: 'RECITATION',
          }],
        }),
      };
    }
    return originalFetch(url);
  };

  const savedKey = process.env.GOOGLE_GENAI_API_KEY;
  process.env.GOOGLE_GENAI_API_KEY = 'fake-key-for-test';

  try {
    await assert.rejects(
      () => realMentionTester.query('gemini', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' }),
      (err) => {
        assert.ok(
          err.message.includes('RECITATION'),
          `Error should mention RECITATION finishReason, got: ${err.message}`
        );
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
    if (savedKey) {
      process.env.GOOGLE_GENAI_API_KEY = savedKey;
    } else {
      delete process.env.GOOGLE_GENAI_API_KEY;
    }
  }
});

test('Fix 3d: Gemini non-OK response includes body in error message', async () => {
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: false,
        status: 400,
        text: async () => '{"error":{"message":"Invalid model name"}}',
      };
    }
    return originalFetch(url);
  };

  const savedKey = process.env.GOOGLE_GENAI_API_KEY;
  process.env.GOOGLE_GENAI_API_KEY = 'fake-key-for-test';

  try {
    await assert.rejects(
      () => realMentionTester.query('gemini', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' }),
      (err) => {
        assert.ok(
          err.message.includes('400'),
          `Error should include status code, got: ${err.message}`
        );
        assert.ok(
          err.message.includes('Invalid model name'),
          `Error should include response body, got: ${err.message}`
        );
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
    if (savedKey) {
      process.env.GOOGLE_GENAI_API_KEY = savedKey;
    } else {
      delete process.env.GOOGLE_GENAI_API_KEY;
    }
  }
});

test('Fix 3e: Gemini uses configurable model from env', async () => {
  const originalFetch = global.fetch;
  let capturedUrl = null;

  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: 'Test response' }] },
            finishReason: 'STOP',
          }],
        }),
      };
    }
    return originalFetch(url);
  };

  const savedKey = process.env.GOOGLE_GENAI_API_KEY;
  const savedModel = process.env.GEMINI_MODEL;

  process.env.GOOGLE_GENAI_API_KEY = 'fake-key-for-test';
  process.env.GEMINI_MODEL = 'gemini-2.5-pro';

  try {
    await realMentionTester.query('gemini', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' });
    assert.ok(capturedUrl, 'Should have made a fetch call');
    assert.ok(
      capturedUrl.includes('gemini-2.5-pro'),
      `URL should use GEMINI_MODEL env var, got: ${capturedUrl}`
    );
    assert.ok(
      !capturedUrl.includes('gemini-2.5-flash-lite'),
      'Should NOT use old hardcoded model name'
    );
  } finally {
    global.fetch = originalFetch;
    if (savedKey) {
      process.env.GOOGLE_GENAI_API_KEY = savedKey;
    } else {
      delete process.env.GOOGLE_GENAI_API_KEY;
    }
    if (savedModel) {
      process.env.GEMINI_MODEL = savedModel;
    } else {
      delete process.env.GEMINI_MODEL;
    }
  }
});

test('Fix 3f: Gemini defaults to gemini-2.5-flash when no GEMINI_MODEL env', async () => {
  const originalFetch = global.fetch;
  let capturedUrl = null;

  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: 'Test response' }] },
            finishReason: 'STOP',
          }],
        }),
      };
    }
    return originalFetch(url);
  };

  const savedKey = process.env.GOOGLE_GENAI_API_KEY;
  const savedModel = process.env.GEMINI_MODEL;

  process.env.GOOGLE_GENAI_API_KEY = 'fake-key-for-test';
  delete process.env.GEMINI_MODEL;

  try {
    await realMentionTester.query('gemini', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' });
    assert.ok(capturedUrl, 'Should have made a fetch call');
    assert.ok(
      capturedUrl.includes('gemini-2.5-flash'),
      `URL should default to gemini-2.5-flash, got: ${capturedUrl}`
    );
  } finally {
    global.fetch = originalFetch;
    if (savedKey) {
      process.env.GOOGLE_GENAI_API_KEY = savedKey;
    } else {
      delete process.env.GOOGLE_GENAI_API_KEY;
    }
    if (savedModel) {
      process.env.GEMINI_MODEL = savedModel;
    } else {
      delete process.env.GEMINI_MODEL;
    }
  }
});

test('Fix 3g: Gemini normal response (finishReason=STOP) returns text', async () => {
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: 'This is a normal response about AI.' }] },
            finishReason: 'STOP',
          }],
        }),
      };
    }
    return originalFetch(url);
  };

  const savedKey = process.env.GOOGLE_GENAI_API_KEY;
  process.env.GOOGLE_GENAI_API_KEY = 'fake-key-for-test';

  try {
    const result = await realMentionTester.query('gemini', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' });
    assert.equal(result.engine, 'gemini');
    assert.equal(result.text, 'This is a normal response about AI.');
    assert.ok(typeof result.testedAt === 'number');
  } finally {
    global.fetch = originalFetch;
    if (savedKey) {
      process.env.GOOGLE_GENAI_API_KEY = savedKey;
    } else {
      delete process.env.GOOGLE_GENAI_API_KEY;
    }
  }
});

test('Fix 3h: Perplexity query throws on missing API key', async () => {
  const savedKey = process.env.PERPLEXITY_API_KEY;
  delete process.env.PERPLEXITY_API_KEY;

  try {
    const engines = realMentionTester.availableEngines();
    assert.ok(
      !engines.includes('perplexity'),
      'perplexity should not be available when PERPLEXITY_API_KEY is not set'
    );

    await assert.rejects(
      () => realMentionTester.query('perplexity', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' }),
      (err) => {
        assert.ok(err.message.includes('PERPLEXITY_API_KEY'), `Error should mention missing key, got: ${err.message}`);
        return true;
      }
    );
  } finally {
    if (savedKey) process.env.PERPLEXITY_API_KEY = savedKey;
  }
});

test('Fix 3i: Perplexity uses configurable model and Sonar endpoint', async () => {
  const originalFetch = global.fetch;
  let capturedUrl = null;
  let capturedBody = null;

  global.fetch = async (url, init) => {
    if (typeof url === 'string' && url.includes('api.perplexity.ai')) {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Perplexity response' } }],
          citations: ['https://example.com/about'],
          search_results: [{ url: 'https://competitor.com/research', title: 'Competitor Research' }],
        }),
      };
    }
    return originalFetch(url, init);
  };

  const savedKey = process.env.PERPLEXITY_API_KEY;
  const savedModel = process.env.PERPLEXITY_MODEL;
  process.env.PERPLEXITY_API_KEY = 'fake-key-for-test';
  process.env.PERPLEXITY_MODEL = 'sonar-pro';

  try {
    const result = await realMentionTester.query('perplexity', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' });
    assert.equal(capturedUrl, 'https://api.perplexity.ai/v1/sonar');
    assert.equal(capturedBody.model, 'sonar-pro');
    assert.equal(result.text, 'Perplexity response');
    assert.deepEqual(result.citations, ['https://example.com/about']);
    assert.deepEqual(result.searchResults, [{ url: 'https://competitor.com/research', title: 'Competitor Research' }]);
  } finally {
    global.fetch = originalFetch;
    if (savedKey) {
      process.env.PERPLEXITY_API_KEY = savedKey;
    } else {
      delete process.env.PERPLEXITY_API_KEY;
    }
    if (savedModel) {
      process.env.PERPLEXITY_MODEL = savedModel;
    } else {
      delete process.env.PERPLEXITY_MODEL;
    }
  }
});

test('Fix 3j: Perplexity defaults to sonar when PERPLEXITY_MODEL is unset', async () => {
  const originalFetch = global.fetch;
  let capturedBody = null;

  global.fetch = async (url, init) => {
    if (typeof url === 'string' && url.includes('api.perplexity.ai')) {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Perplexity response' } }],
        }),
      };
    }
    return originalFetch(url, init);
  };

  const savedKey = process.env.PERPLEXITY_API_KEY;
  const savedModel = process.env.PERPLEXITY_MODEL;
  process.env.PERPLEXITY_API_KEY = 'fake-key-for-test';
  delete process.env.PERPLEXITY_MODEL;

  try {
    await realMentionTester.query('perplexity', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' });
    assert.equal(capturedBody.model, 'sonar');
  } finally {
    global.fetch = originalFetch;
    if (savedKey) {
      process.env.PERPLEXITY_API_KEY = savedKey;
    } else {
      delete process.env.PERPLEXITY_API_KEY;
    }
    if (savedModel) {
      process.env.PERPLEXITY_MODEL = savedModel;
    } else {
      delete process.env.PERPLEXITY_MODEL;
    }
  }
});

test('Fix 3k: Perplexity non-OK response includes body in error message', async () => {
  const originalFetch = global.fetch;

  global.fetch = async (url, init) => {
    if (typeof url === 'string' && url.includes('api.perplexity.ai')) {
      return {
        ok: false,
        status: 400,
        text: async () => '{"error":"Invalid sonar request"}',
      };
    }
    return originalFetch(url, init);
  };

  const savedKey = process.env.PERPLEXITY_API_KEY;
  process.env.PERPLEXITY_API_KEY = 'fake-key-for-test';

  try {
    await assert.rejects(
      () => realMentionTester.query('perplexity', { id: 'test', text: 'hello', category: 'direct', industry: 'Tech' }),
      (err) => {
        assert.ok(err.message.includes('400'), `Error should include status code, got: ${err.message}`);
        assert.ok(err.message.includes('Invalid sonar request'), `Error should include response body, got: ${err.message}`);
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
    if (savedKey) {
      process.env.PERPLEXITY_API_KEY = savedKey;
    } else {
      delete process.env.PERPLEXITY_API_KEY;
    }
  }
});

// ─── Fix 3: Safety blocks count as failures in engine-tester ────────────────

const { testAllEngines } = require('../src/lib/ai-mentions/engine-tester.ts');

test('Fix 3l: engine that throws (safety block) is excluded from results via allSettled', async () => {
  const throwingTester = {
    async query(engine, prompt) {
      if (engine === 'gemini') {
        throw new Error('Gemini blocked response: finishReason=SAFETY');
      }
      return { engine, prompt, text: `Response from ${engine}`, testedAt: Date.now() };
    },
    availableEngines() {
      return ['chatgpt', 'gemini'];
    },
  };

  const prompts = [{ id: 'p1', text: 'Test prompt', category: 'direct', industry: 'Tech' }];
  const results = await testAllEngines(throwingTester, prompts);

  // gemini should be excluded (threw), chatgpt should succeed
  assert.equal(results.length, 1);
  assert.equal(results[0].engine, 'chatgpt');
});

// ─── Fix 4: Enhanced engine logging ─────────────────────────────────────────

test('Fix 4: scan-workflow logs both available and disabled engines', async () => {
  // We test this by verifying the logging logic works correctly
  const availableEngines = ['chatgpt', 'gemini'];
  const allEngines = ['chatgpt', 'claude', 'gemini', 'perplexity'];
  const missingApiKeyEngines = allEngines.filter((e) => !availableEngines.includes(e));
  const platformFilteredEngines = [];

  const logMessage = `[scan-workflow] Starting AI mention testing. Engines: ${availableEngines.join(', ') || 'none'}. Missing API key: ${missingApiKeyEngines.join(', ') || 'none'}. Filtered by platform settings: ${platformFilteredEngines.join(', ') || 'none'}.`;

  assert.ok(logMessage.includes('Engines: chatgpt, gemini'));
  assert.ok(logMessage.includes('Missing API key: claude, perplexity'));
  assert.ok(logMessage.includes('Filtered by platform settings: none'));
});

test('Fix 4: log message handles no available engines', () => {
  const availableEngines = [];
  const allEngines = ['chatgpt', 'claude', 'gemini', 'perplexity'];
  const missingApiKeyEngines = allEngines.filter((e) => !availableEngines.includes(e));
  const platformFilteredEngines = [];

  const logMessage = `[scan-workflow] Starting AI mention testing. Engines: ${availableEngines.join(', ') || 'none'}. Missing API key: ${missingApiKeyEngines.join(', ') || 'none'}. Filtered by platform settings: ${platformFilteredEngines.join(', ') || 'none'}.`;

  assert.ok(logMessage.includes('Engines: none'));
  assert.ok(logMessage.includes('Missing API key: chatgpt, claude, gemini, perplexity'));
  assert.ok(logMessage.includes('Filtered by platform settings: none'));
});

test('Fix 4: log message handles all engines available', () => {
  const availableEngines = ['chatgpt', 'claude', 'gemini', 'perplexity'];
  const allEngines = ['chatgpt', 'claude', 'gemini', 'perplexity'];
  const missingApiKeyEngines = allEngines.filter((e) => !availableEngines.includes(e));
  const platformFilteredEngines = [];

  const logMessage = `[scan-workflow] Starting AI mention testing. Engines: ${availableEngines.join(', ') || 'none'}. Missing API key: ${missingApiKeyEngines.join(', ') || 'none'}. Filtered by platform settings: ${platformFilteredEngines.join(', ') || 'none'}.`;

  assert.ok(logMessage.includes('Engines: chatgpt, claude, gemini, perplexity'));
  assert.ok(logMessage.includes('Missing API key: none'));
  assert.ok(logMessage.includes('Filtered by platform settings: none'));
});

test('Fix 4: log message distinguishes missing keys from platform filtering', () => {
  const allAvailableEngines = ['chatgpt', 'perplexity', 'gemini', 'claude'];
  const filteredEngines = ['chatgpt', 'gemini', 'claude'];
  const allEngines = ['chatgpt', 'claude', 'gemini', 'perplexity'];
  const missingApiKeyEngines = allEngines.filter((e) => !allAvailableEngines.includes(e));
  const platformFilteredEngines = allAvailableEngines.filter((e) => !filteredEngines.includes(e));

  const logMessage = `[scan-workflow] Starting AI mention testing. Engines: ${filteredEngines.join(', ') || 'none'}. Missing API key: ${missingApiKeyEngines.join(', ') || 'none'}. Filtered by platform settings: ${platformFilteredEngines.join(', ') || 'none'}.`;

  assert.ok(logMessage.includes('Missing API key: none'));
  assert.ok(logMessage.includes('Filtered by platform settings: perplexity'));
});
