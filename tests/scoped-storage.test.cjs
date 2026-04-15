require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadStoredDomainsAcrossScopes,
  saveStoredDomains,
  loadHiddenDomainsAcrossScopes,
  saveHiddenDomains,
} = require('../src/app/advanced/lib/storage.ts');
const {
  getRecentScanEntries,
  getRecentScanEntriesForScopes,
  rememberRecentScanForScopes,
} = require('../src/lib/recent-scans.ts');

function createStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test.beforeEach(() => {
  global.window = { localStorage: createStorage() };
});

test.afterEach(() => {
  delete global.window;
});

test('loadStoredDomainsAcrossScopes merges explicit tracked domains from both scopes without duplicates', () => {
  saveStoredDomains(['shetechexplorer.com', 'marine-products.com'], 'user-id-1');
  saveStoredDomains(['marine-products.com', 'getpostgame.ai', 'viciousshade.com'], 'ryan@example.com');

  assert.deepEqual(
    loadStoredDomainsAcrossScopes('user-id-1', 'ryan@example.com'),
    ['shetechexplorer.com', 'marine-products.com', 'getpostgame.ai', 'viciousshade.com']
  );
});

test('loadHiddenDomainsAcrossScopes merges hidden domain state across migrated scopes', () => {
  saveHiddenDomains(['old-hidden.com'], 'user-id-1');
  saveHiddenDomains(['new-hidden.com', 'old-hidden.com'], 'ryan@example.com');

  assert.deepEqual(
    loadHiddenDomainsAcrossScopes('user-id-1', 'ryan@example.com'),
    ['old-hidden.com', 'new-hidden.com']
  );
});

test('rememberRecentScanForScopes writes to both scopes and getRecentScanEntriesForScopes merges by newest timestamp', async () => {
  const originalNow = Date.now;
  let tick = 100;
  Date.now = () => tick;

  rememberRecentScanForScopes('scan-1', 'user-id-1', 'ryan@example.com');
  tick = 200;
  rememberRecentScanForScopes('scan-2', 'user-id-1', 'ryan@example.com');
  tick = 300;
  rememberRecentScanForScopes('scan-3', 'ryan@example.com');

  assert.deepEqual(
    getRecentScanEntries('user-id-1').map((entry) => entry.id),
    ['scan-2', 'scan-1']
  );
  assert.deepEqual(
    getRecentScanEntries('ryan@example.com').map((entry) => entry.id),
    ['scan-3', 'scan-2', 'scan-1']
  );
  assert.deepEqual(
    getRecentScanEntriesForScopes('user-id-1', 'ryan@example.com').map((entry) => entry.id),
    ['scan-3', 'scan-2', 'scan-1']
  );

  Date.now = originalNow;
});
