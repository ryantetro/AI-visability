require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addPendingDomainToManualDomains,
  buildWorkspaceSiteSummaries,
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

test('buildWorkspaceSiteSummaries only includes explicitly tracked domains', () => {
  const sites = buildWorkspaceSiteSummaries({
    hiddenDomains: [],
    manualDomains: ['shetechexplorer.com', 'marine-products.com'],
    monitoringLatestScanAtByDomain: {},
    recentScans: [
      {
        id: 'scan-1',
        url: 'https://getpostgame.ai',
        status: 'complete',
        hasEmail: true,
        hasPaid: false,
        createdAt: 10,
        completedAt: 20,
        scores: { aiVisibility: 52, webHealth: 60, overall: 54, potentialLift: 20 },
      },
    ],
    selectedDomain: 'getpostgame.ai',
  });

  assert.deepEqual(
    sites.map((site) => site.domain),
    ['shetechexplorer.com', 'marine-products.com']
  );
  assert.equal(sites.some((site) => site.domain === 'getpostgame.ai'), false);
});

test('buildWorkspaceSiteSummaries enriches tracked domains with latest scan metadata and pins the active tracked domain', () => {
  const sites = buildWorkspaceSiteSummaries({
    hiddenDomains: [],
    manualDomains: ['tracked.com', 'other-tracked.com'],
    monitoringLatestScanAtByDomain: { 'tracked.com': 30, 'other-tracked.com': 40 },
    recentScans: [
      {
        id: 'scan-2',
        url: 'https://tracked.com',
        status: 'complete',
        hasEmail: true,
        hasPaid: false,
        createdAt: 5,
        completedAt: 15,
        scores: { aiVisibility: 66, webHealth: 72, overall: 68, potentialLift: 12 },
      },
      {
        id: 'scan-3',
        url: 'https://other-tracked.com',
        status: 'complete',
        hasEmail: true,
        hasPaid: false,
        createdAt: 25,
        completedAt: 35,
        scores: { aiVisibility: 76, webHealth: 81, overall: 79, potentialLift: 8 },
      },
    ],
    selectedDomain: 'tracked.com',
  });

  assert.equal(sites.length, 2);
  assert.equal(sites[0].domain, 'tracked.com');
  assert.equal(sites[0].source, 'tracked');
  assert.equal(sites[0].latestScan?.id, 'scan-2');
  assert.equal(sites[1].domain, 'other-tracked.com');
});

test('buildWorkspaceSiteSummaries preserves tracked-domain order when no scan metadata exists', () => {
  const sites = buildWorkspaceSiteSummaries({
    hiddenDomains: [],
    manualDomains: ['third.com', 'first.com', 'second.com'],
    monitoringLatestScanAtByDomain: {},
    recentScans: [],
    selectedDomain: null,
  });

  assert.deepEqual(
    sites.map((site) => site.domain),
    ['third.com', 'first.com', 'second.com']
  );
});

test('buildWorkspaceSiteSummaries keeps tracked domains authoritative when they also have scans', () => {
  const sites = buildWorkspaceSiteSummaries({
    hiddenDomains: [],
    manualDomains: ['tracked.com'],
    monitoringLatestScanAtByDomain: { 'tracked.com': 30 },
    recentScans: [
      {
        id: 'scan-4',
        url: 'https://tracked.com',
        status: 'complete',
        hasEmail: true,
        hasPaid: false,
        createdAt: 5,
        completedAt: 15,
        scores: { aiVisibility: 66, webHealth: 72, overall: 68, potentialLift: 12 },
      },
    ],
    selectedDomain: null,
  });

  assert.equal(sites.length, 1);
  assert.equal(sites[0].domain, 'tracked.com');
  assert.equal(sites[0].source, 'tracked');
  assert.equal(sites[0].latestScan?.id, 'scan-4');
});

test('buildWorkspaceSiteSummaries excludes hidden domains even when scans exist', () => {
  const sites = buildWorkspaceSiteSummaries({
    hiddenDomains: ['hidden.com'],
    manualDomains: [],
    monitoringLatestScanAtByDomain: {},
    recentScans: [
      {
        id: 'scan-3',
        url: 'https://hidden.com',
        status: 'complete',
        hasEmail: true,
        hasPaid: false,
        createdAt: 1,
        completedAt: 2,
        scores: { aiVisibility: 40, webHealth: 41, overall: 40, potentialLift: 30 },
      },
    ],
    selectedDomain: 'visible.com',
  });

  assert.deepEqual(sites, []);
});
