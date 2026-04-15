import { getLatestPaidScanByDomain, getLatestScanByDomain } from '@/app/advanced/lib/utils';
import type { RecentScanData, SiteSummary } from '@/app/advanced/lib/types';

export type AppShellSection = 'history' | 'leaderboard' | 'featured' | 'dashboard';

export function detectAppShellSection(pathname: string): AppShellSection {
  if (pathname.startsWith('/history')) return 'history';
  if (pathname.startsWith('/leaderboard')) return 'leaderboard';
  if (pathname.startsWith('/featured')) return 'featured';
  return 'dashboard';
}

export function workspaceRouteNeedsFiles(pathname: string, advancedSection: string | null): boolean {
  if (pathname.startsWith('/report')) return true;
  if (pathname.startsWith('/brand')) return true;
  if (!pathname.startsWith('/advanced')) return false;
  return advancedSection === 'report' || advancedSection === 'brand';
}

export function reconcileHiddenDomains(hiddenDomains: string[], trackedDomains: string[]): string[] {
  const tracked = new Set(trackedDomains.map((domain) => domain.toLowerCase()));
  return hiddenDomains.filter((domain) => !tracked.has(domain.toLowerCase()));
}

export function addPendingDomainToManualDomains(manualDomains: string[], pendingDomain: string | null): string[] {
  if (!pendingDomain || manualDomains.includes(pendingDomain)) {
    return manualDomains;
  }

  return [pendingDomain, ...manualDomains];
}

interface BuildWorkspaceSiteSummariesInput {
  hiddenDomains: string[];
  manualDomains: string[];
  monitoringLatestScanAtByDomain: Record<string, number | null>;
  recentScans: RecentScanData[];
  selectedDomain?: string | null;
}

function normalizeWorkspaceDomain(domain?: string | null) {
  const normalized = domain?.trim().toLowerCase() || '';
  return normalized || null;
}

export function buildWorkspaceSiteSummaries({
  hiddenDomains,
  manualDomains,
  monitoringLatestScanAtByDomain,
  recentScans,
  selectedDomain,
}: BuildWorkspaceSiteSummariesInput): SiteSummary[] {
  const hiddenSet = new Set(hiddenDomains.map((domain) => domain.toLowerCase()));
  const activeDomain = normalizeWorkspaceDomain(selectedDomain);
  const trackedOrder = new Map(
    manualDomains
      .map((domain, index) => [normalizeWorkspaceDomain(domain), index] as const)
      .filter((entry): entry is readonly [string, number] => Boolean(entry[0]))
  );
  const domains = new Set<string>();

  const addDomain = (domain?: string | null) => {
    const normalized = normalizeWorkspaceDomain(domain);
    if (!normalized || hiddenSet.has(normalized)) return;
    domains.add(normalized);
  };

  manualDomains.forEach(addDomain);

  return [...domains]
    .map<SiteSummary>((domain) => {
      const latestScan = getLatestScanByDomain(recentScans, domain);
      const latestPaidScan = getLatestPaidScanByDomain(recentScans, domain);
      const lastTouchedAt = Math.max(
        latestPaidScan?.completedAt ?? 0,
        latestPaidScan?.createdAt ?? 0,
        latestScan?.completedAt ?? 0,
        latestScan?.createdAt ?? 0,
        monitoringLatestScanAtByDomain[domain] ?? 0,
      ) || null;

      return {
        domain,
        url: latestPaidScan?.url ?? latestScan?.url ?? `https://${domain}`,
        latestScan,
        latestPaidScan,
        lastTouchedAt,
        source: 'tracked',
      };
    })
    .sort((a, b) => {
      const aIsActive = activeDomain ? a.domain === activeDomain : false;
      const bIsActive = activeDomain ? b.domain === activeDomain : false;

      if (aIsActive !== bIsActive) {
        return aIsActive ? -1 : 1;
      }

      const touchedDelta = (b.lastTouchedAt ?? 0) - (a.lastTouchedAt ?? 0);
      if (touchedDelta !== 0) {
        return touchedDelta;
      }

      const aTrackedOrder = trackedOrder.get(a.domain) ?? Number.MAX_SAFE_INTEGER;
      const bTrackedOrder = trackedOrder.get(b.domain) ?? Number.MAX_SAFE_INTEGER;
      if (aTrackedOrder !== bTrackedOrder) {
        return aTrackedOrder - bTrackedOrder;
      }

      return a.domain.localeCompare(b.domain);
    });
}
