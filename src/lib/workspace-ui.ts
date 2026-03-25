export type AppShellSection = 'history' | 'leaderboard' | 'featured' | 'dashboard';

export function detectAppShellSection(pathname: string): AppShellSection {
  if (pathname.startsWith('/history')) return 'history';
  if (pathname.startsWith('/leaderboard')) return 'leaderboard';
  if (pathname.startsWith('/featured')) return 'featured';
  return 'dashboard';
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
