require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addPendingDomainToManualDomains,
  detectAppShellSection,
  reconcileHiddenDomains,
  workspaceRouteNeedsFiles,
} = require('../src/lib/workspace-ui.ts');

test('detectAppShellSection keeps workspace routes highlighted under Dashboard', () => {
  assert.equal(detectAppShellSection('/dashboard'), 'dashboard');
  assert.equal(detectAppShellSection('/report'), 'dashboard');
  assert.equal(detectAppShellSection('/brand'), 'dashboard');
  assert.equal(detectAppShellSection('/competitors'), 'dashboard');
  assert.equal(detectAppShellSection('/settings'), 'dashboard');
  assert.equal(detectAppShellSection('/advanced'), 'dashboard');
});

test('workspaceRouteNeedsFiles only blocks on report-heavy routes', () => {
  assert.equal(workspaceRouteNeedsFiles('/dashboard', null), false);
  assert.equal(workspaceRouteNeedsFiles('/settings', null), false);
  assert.equal(workspaceRouteNeedsFiles('/analytics', null), false);
  assert.equal(workspaceRouteNeedsFiles('/report', null), true);
  assert.equal(workspaceRouteNeedsFiles('/brand', null), true);
  assert.equal(workspaceRouteNeedsFiles('/advanced', 'dashboard'), false);
  assert.equal(workspaceRouteNeedsFiles('/advanced', 'report'), true);
  assert.equal(workspaceRouteNeedsFiles('/advanced', 'brand'), true);
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
