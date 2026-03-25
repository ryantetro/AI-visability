require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addPendingDomainToManualDomains,
  detectAppShellSection,
  reconcileHiddenDomains,
} = require('../src/lib/workspace-ui.ts');

test('detectAppShellSection keeps workspace routes highlighted under Dashboard', () => {
  assert.equal(detectAppShellSection('/dashboard'), 'dashboard');
  assert.equal(detectAppShellSection('/report'), 'dashboard');
  assert.equal(detectAppShellSection('/brand'), 'dashboard');
  assert.equal(detectAppShellSection('/competitors'), 'dashboard');
  assert.equal(detectAppShellSection('/settings'), 'dashboard');
  assert.equal(detectAppShellSection('/advanced'), 'dashboard');
});

test('reconcileHiddenDomains preserves user-hidden scan domains when tracked domains sync from DB', () => {
  assert.deepEqual(
    reconcileHiddenDomains(['hidden-scan.com', 'tracked.com'], ['tracked.com', 'another-tracked.com']),
    ['hidden-scan.com']
  );
});

test('addPendingDomainToManualDomains prepends attempted upgrade domains without duplicates', () => {
  assert.deepEqual(
    addPendingDomainToManualDomains(['existing.com'], 'new-site.com'),
    ['new-site.com', 'existing.com']
  );
  assert.deepEqual(
    addPendingDomainToManualDomains(['existing.com'], 'existing.com'),
    ['existing.com']
  );
  assert.deepEqual(
    addPendingDomainToManualDomains(['existing.com'], null),
    ['existing.com']
  );
});
