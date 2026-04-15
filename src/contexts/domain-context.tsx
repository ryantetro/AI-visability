'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ensureProtocol, getDomain, getFaviconUrl } from '@/lib/url-utils';
import { getRecentScanEntriesForScopes, rememberRecentScanForScopes } from '@/lib/recent-scans';
import { invalidateBillingStatus } from '@/hooks/use-billing-status';
import { invalidatePlanCache, usePlan } from '@/hooks/use-plan';
import { getCurrentAppPath } from '@/lib/app-paths';
import { buildScopedStorageKey, getClientStorageScope } from '@/lib/client-storage-scope';
import { useAuth } from '@/hooks/use-auth';
import {
  loadStoredDomainsAcrossScopes,
  saveStoredDomains,
  loadHiddenDomainsAcrossScopes,
  saveHiddenDomains,
} from '@/app/advanced/lib/storage';
import {
  normalizeDomainInput,
  getLatestPaidScanByDomain,
  getLatestMonitorableScanByDomain,
} from '@/app/advanced/lib/utils';
import {
  addPendingDomainToManualDomains,
  buildWorkspaceSiteSummaries,
  reconcileHiddenDomains,
  workspaceRouteNeedsFiles,
} from '@/lib/workspace-ui';

import type { DashboardReportData, FilesData, RecentScanData, SiteSummary, ApiErrorPayload } from '@/app/advanced/lib/types';

interface DomainContextValue {
  // Domain list
  monitoredSites: SiteSummary[];
  trackedSites: SiteSummary[];
  scannedSites: SiteSummary[];
  selectedDomain: string | null;
  activeReportId: string | null;
  selectDomain: (domain: string) => void;

  // Add domain
  addDomainInput: string;
  setAddDomainInput: (v: string) => void;
  handleAddDomain: () => Promise<{ ok: boolean; error?: string }>;
  addTrackedDomain: (domain: string) => Promise<{ ok: boolean; error?: string }>;
  handleRemoveDomain: (domain: string) => void;
  addError: string | null;
  confirmChecked: boolean;
  setConfirmChecked: (v: boolean) => void;
  scanAutoStarting: boolean;

  // Workspace data
  hasPaidAccess: boolean;
  report: DashboardReportData | null;
  files: FilesData | null;
  workspaceLoading: boolean;
  loadError: string;
  recentScans: RecentScanData[];
  domainsLoading: boolean;
  recentLoading: boolean;

  // Actions
  expandedSite: SiteSummary | null;
  actionError: string;
  reauditLoading: boolean;
  handleReaudit: () => Promise<void>;
  handleRunFirstScan: (site: SiteSummary) => Promise<void>;
  monitoringConnected: Record<string, boolean>;
  monitoringLoading: boolean;
  handleEnableMonitoring: () => Promise<void>;
  handleDisableMonitoring: () => Promise<void>;

  // Unlock
  unlockModalOpen: boolean;
  setUnlockModalOpen: (v: boolean) => void;
  handleUnlockComplete: (plan?: string) => void;
  unlockLoading: boolean;
  pendingDomain: string | null;
  paidOverride: boolean;
  debugPaidPreview: boolean;
  checkoutBanner: string | null;
  dismissCheckoutBanner: () => void;
  inputFaviconUrl: string | null;
}

const DomainContext = createContext<DomainContextValue | null>(null);
const PENDING_DOMAIN_STORAGE_KEY = 'aiso_pending_domain_upgrade';
const SELECTED_DOMAIN_STORAGE_KEY = 'aiso_selected_domain';
const CHECKOUT_BANNER_DURATION_MS = 12000;

const recentScansMemoryCache = new Map<string, RecentScanData[]>();
const domainListMemoryCache = new Map<string, { manualDomains: string[]; hiddenDomains: string[] }>();
const monitoringMemoryCache = new Map<string, {
  connected: Record<string, boolean>;
  latestScanAtByDomain: Record<string, number | null>;
}>();

function mergeUniqueDomains(...lists: Array<string[] | undefined>) {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    if (!list) continue;
    for (const value of list) {
      const normalized = value.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(normalized);
    }
  }

  return merged;
}

function mergeRecentScanLists(...lists: Array<RecentScanData[] | undefined>) {
  const byId = new Map<string, RecentScanData>();

  for (const list of lists) {
    if (!list) continue;
    for (const scan of list) {
      const existing = byId.get(scan.id);
      const nextTimestamp = scan.completedAt ?? scan.createdAt;
      const existingTimestamp = existing ? (existing.completedAt ?? existing.createdAt) : -1;
      if (!existing || nextTimestamp >= existingTimestamp) {
        byId.set(scan.id, scan);
      }
    }
  }

  return [...byId.values()].sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
}

function getScopedMemoryCacheValue<T>(
  cache: Map<string, T>,
  primaryScope?: string | null,
  secondaryScope?: string | null,
) {
  const primaryValue = primaryScope ? cache.get(primaryScope) : undefined;
  if (!secondaryScope || secondaryScope === primaryScope) {
    return primaryValue;
  }
  return primaryValue ?? cache.get(secondaryScope);
}

function loadSelectedDomain(scopeKey?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  const storageKey = buildScopedStorageKey(SELECTED_DOMAIN_STORAGE_KEY, scopeKey);
  if (!storageKey) return null;
  return window.localStorage.getItem(storageKey);
}

function saveSelectedDomain(domain: string | null, scopeKey?: string | null) {
  if (typeof window === 'undefined') return;
  const storageKey = buildScopedStorageKey(SELECTED_DOMAIN_STORAGE_KEY, scopeKey);
  if (!storageKey) return;
  if (domain) {
    window.localStorage.setItem(storageKey, domain);
  } else {
    window.localStorage.removeItem(storageKey);
  }
}

function loadSelectedDomainForScopes(primaryScope?: string | null, secondaryScope?: string | null): string | null {
  return loadSelectedDomain(primaryScope)
    ?? (secondaryScope && secondaryScope !== primaryScope ? loadSelectedDomain(secondaryScope) : null);
}

function saveSelectedDomainForScopes(domain: string | null, primaryScope?: string | null, secondaryScope?: string | null) {
  saveSelectedDomain(domain, primaryScope);
  if (secondaryScope && secondaryScope !== primaryScope) {
    saveSelectedDomain(domain, secondaryScope);
  }
}

function loadStoredDomainsForScopes(primaryScope?: string | null, secondaryScope?: string | null): string[] {
  return loadStoredDomainsAcrossScopes(primaryScope, secondaryScope);
}

function saveStoredDomainsForScopes(domains: string[], primaryScope?: string | null, secondaryScope?: string | null) {
  saveStoredDomains(domains, primaryScope);
  if (secondaryScope && secondaryScope !== primaryScope) {
    saveStoredDomains(domains, secondaryScope);
  }
}

function loadHiddenDomainsForScopes(primaryScope?: string | null, secondaryScope?: string | null): string[] {
  return loadHiddenDomainsAcrossScopes(primaryScope, secondaryScope);
}

function saveHiddenDomainsForScopes(domains: string[], primaryScope?: string | null, secondaryScope?: string | null) {
  saveHiddenDomains(domains, primaryScope);
  if (secondaryScope && secondaryScope !== primaryScope) {
    saveHiddenDomains(domains, secondaryScope);
  }
}

export function useDomainContext() {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error('useDomainContext must be used within DomainContextProvider');
  return ctx;
}

export function useDomainContextSafe() {
  return useContext(DomainContext);
}

export function DomainContextProvider({
  reportId,
  children,
}: {
  reportId: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReportId = reportId ?? '';
  const debugPaidPreview = process.env.NODE_ENV === 'development' && searchParams.get('debugPaid') === '1';
  const { isPaid: planIsPaid } = usePlan();
  const { user: authUser, loading: authLoading } = useAuth();
  const storageScope = authUser?.id ?? authUser?.email ?? getClientStorageScope();
  const secondaryStorageScope = authUser?.id && authUser.email && authUser.email !== authUser.id
    ? authUser.email
    : null;
  const cachedDomainState = useMemo(() => {
    const primaryCachedDomainState = getScopedMemoryCacheValue(domainListMemoryCache, storageScope, secondaryStorageScope);
    const secondaryCachedDomainState = secondaryStorageScope && secondaryStorageScope !== storageScope
      ? domainListMemoryCache.get(secondaryStorageScope)
      : undefined;

    if (!primaryCachedDomainState && !secondaryCachedDomainState) {
      return undefined;
    }

    return {
      manualDomains: mergeUniqueDomains(primaryCachedDomainState?.manualDomains, secondaryCachedDomainState?.manualDomains),
      hiddenDomains: mergeUniqueDomains(primaryCachedDomainState?.hiddenDomains, secondaryCachedDomainState?.hiddenDomains),
    };
  }, [storageScope, secondaryStorageScope]);
  const cachedMonitoringState = useMemo(() => {
    const primaryCachedMonitoringState = getScopedMemoryCacheValue(monitoringMemoryCache, storageScope, secondaryStorageScope);
    const secondaryCachedMonitoringState = secondaryStorageScope && secondaryStorageScope !== storageScope
      ? monitoringMemoryCache.get(secondaryStorageScope)
      : undefined;

    if (!primaryCachedMonitoringState && !secondaryCachedMonitoringState) {
      return undefined;
    }

    return {
      connected: {
        ...(secondaryCachedMonitoringState?.connected ?? {}),
        ...(primaryCachedMonitoringState?.connected ?? {}),
      },
      latestScanAtByDomain: {
        ...(secondaryCachedMonitoringState?.latestScanAtByDomain ?? {}),
        ...(primaryCachedMonitoringState?.latestScanAtByDomain ?? {}),
      },
    };
  }, [storageScope, secondaryStorageScope]);
  const cachedRecentScans = useMemo(
    () => mergeRecentScanLists(
      storageScope ? recentScansMemoryCache.get(storageScope) : undefined,
      secondaryStorageScope && secondaryStorageScope !== storageScope
        ? recentScansMemoryCache.get(secondaryStorageScope)
        : undefined,
    ),
    [storageScope, secondaryStorageScope]
  );
  const prefilledDomain = normalizeDomainInput(searchParams.get('prefillDomain') ?? '');
  const shouldLoadFilesForSection = workspaceRouteNeedsFiles(pathname ?? '', searchParams.get('section'));

  const [recentScans, setRecentScans] = useState<RecentScanData[]>(() => cachedRecentScans);
  const [recentLoading, setRecentLoading] = useState(() => storageScope ? cachedRecentScans.length === 0 : true);
  const [domainsLoading, setDomainsLoading] = useState(() => Boolean(storageScope));
  const [manualDomains, setManualDomains] = useState<string[]>(() => (
    cachedDomainState?.manualDomains ?? loadStoredDomainsForScopes(storageScope, secondaryStorageScope)
  ));
  const [hiddenDomains, setHiddenDomains] = useState<string[]>(() => (
    cachedDomainState?.hiddenDomains ?? loadHiddenDomainsForScopes(storageScope, secondaryStorageScope)
  ));
  const [paidOverride, setPaidOverride] = useState(false);
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);
  const domainParam = searchParams.get('domain');
  const [selectedDomain, setSelectedDomainRaw] = useState<string | null>(() => (
    normalizeDomainInput(domainParam ?? '') || loadSelectedDomainForScopes(storageScope, secondaryStorageScope)
  ));
  const [files, setFiles] = useState<FilesData | null>(null);
  const [report, setReport] = useState<DashboardReportData | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(Boolean(initialReportId));
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reauditLoading, setReauditLoading] = useState(false);
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringConnected, setMonitoringConnected] = useState<Record<string, boolean>>(() => cachedMonitoringState?.connected ?? {});
  const [monitoringLatestScanAtByDomain, setMonitoringLatestScanAtByDomain] = useState<Record<string, number | null>>(() => cachedMonitoringState?.latestScanAtByDomain ?? {});
  const [addDomainInput, setAddDomainInput] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [scanAutoStarting, setScanAutoStarting] = useState(false);

  useEffect(() => {
    const normalizedDomainParam = normalizeDomainInput(domainParam ?? '');
    if (normalizedDomainParam && normalizedDomainParam !== selectedDomain) {
      setSelectedDomainRaw(normalizedDomainParam);
      saveSelectedDomainForScopes(normalizedDomainParam, storageScope, secondaryStorageScope);
      return;
    }

    if (!normalizedDomainParam && !selectedDomain && storageScope) {
      const storedDomain = loadSelectedDomainForScopes(storageScope, secondaryStorageScope);
      if (storedDomain) {
        setSelectedDomainRaw(storedDomain);
      }
    }
  }, [domainParam, selectedDomain, storageScope, secondaryStorageScope]);

  useEffect(() => {
    if (!prefilledDomain) return;
    if (manualDomains.length > 0) return;
    setAddDomainInput((current) => current.trim() ? current : prefilledDomain);
  }, [prefilledDomain, manualDomains.length]);

  // Persist selected domain in URL so refresh restores it
  const setSelectedDomain = useCallback((domain: string | null, options?: { preserveReport?: boolean }) => {
    setSelectedDomainRaw(domain);
    saveSelectedDomainForScopes(domain, storageScope, secondaryStorageScope);
    const params = new URLSearchParams(window.location.search);
    if (domain) {
      params.set('domain', domain);
    } else {
      params.delete('domain');
    }
    if (!options?.preserveReport) {
      params.delete('report');
    }
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [storageScope, secondaryStorageScope]);
  const dismissCheckoutBanner = useCallback(() => {
    setCheckoutBanner(null);
  }, []);

  // Caches for instant domain switching
  const [reportCache, setReportCache] = useState<Record<string, DashboardReportData>>({});
  const [filesCache, setFilesCache] = useState<Record<string, FilesData>>({});

  // --- Load initial data: scoped local cache first, then reconcile with DB ---
  useEffect(() => {
    if (!storageScope) {
      setManualDomains([]);
      setHiddenDomains([]);
      setDomainsLoading(false);
      return;
    }

    const cached = cachedDomainState;
    if (cached) {
      setManualDomains(cached.manualDomains);
      setHiddenDomains(cached.hiddenDomains);
    } else {
      setManualDomains(loadStoredDomainsForScopes(storageScope, secondaryStorageScope));
      setHiddenDomains(loadHiddenDomainsForScopes(storageScope, secondaryStorageScope));
    }

    if (authLoading) {
      setDomainsLoading(false);
      return;
    }

    setDomainsLoading(true);

    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/user/domains', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const dbDomains: string[] = (data.domains ?? []).map((d: { domain: string }) => d.domain);
        if (!active) return;

        setManualDomains(dbDomains);
        saveStoredDomainsForScopes(dbDomains, storageScope, secondaryStorageScope);
        const nextHiddenDomains = reconcileHiddenDomains(loadHiddenDomainsForScopes(storageScope, secondaryStorageScope), dbDomains);
        setHiddenDomains(nextHiddenDomains);
        saveHiddenDomainsForScopes(nextHiddenDomains, storageScope, secondaryStorageScope);
        domainListMemoryCache.set(storageScope, {
          manualDomains: dbDomains,
          hiddenDomains: nextHiddenDomains,
        });
        if (secondaryStorageScope && secondaryStorageScope !== storageScope) {
          domainListMemoryCache.set(secondaryStorageScope, {
            manualDomains: dbDomains,
            hiddenDomains: nextHiddenDomains,
          });
        }
      } catch { /* keep localStorage data on network failure */ }
      finally {
        if (active) {
          setDomainsLoading(false);
        }
      }
    })();

    return () => { active = false; };
  }, [authLoading, cachedDomainState, storageScope, secondaryStorageScope]);

  // --- Hydrate monitoring status from DB ---
  useEffect(() => {
    if (!storageScope) {
      setMonitoringConnected({});
      setMonitoringLatestScanAtByDomain({});
      return;
    }

    const cached = cachedMonitoringState;
    if (cached) {
      setMonitoringConnected(cached.connected);
      setMonitoringLatestScanAtByDomain(cached.latestScanAtByDomain);
    }

    if (authLoading) {
      return;
    }

    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/monitoring', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const domains: Array<{ domain: string; status: string; latestDomainScanAt?: number | null }> = data.domains ?? [];
        if (!active) return;
        const connected: Record<string, boolean> = {};
        const latestScanAtByDomain: Record<string, number | null> = {};
        for (const d of domains) {
          if (d.status === 'active') {
            connected[d.domain] = true;
          }
          latestScanAtByDomain[d.domain] = d.latestDomainScanAt ?? null;
        }
        setMonitoringConnected(connected);
        setMonitoringLatestScanAtByDomain(latestScanAtByDomain);
        monitoringMemoryCache.set(storageScope, { connected, latestScanAtByDomain });
        if (secondaryStorageScope && secondaryStorageScope !== storageScope) {
          monitoringMemoryCache.set(secondaryStorageScope, { connected, latestScanAtByDomain });
        }
      } catch { /* keep current state on failure */ }
    })();
    return () => { active = false; };
  }, [authLoading, cachedMonitoringState, storageScope, secondaryStorageScope]);

  // --- Load recent scans from DB API ---
  useEffect(() => {
    if (!storageScope) {
      setRecentScans([]);
      setRecentLoading(false);
      return;
    }

    const scopeKey = storageScope;
    let active = true;
    if (cachedRecentScans.length > 0) {
      setRecentScans(cachedRecentScans);
      setRecentLoading(false);
    } else {
      setRecentLoading(true);
    }

    if (authLoading) {
      return () => { active = false; };
    }

    async function loadRecentScans() {
      let shouldUseStorageFallback = false;
      try {
        const res = await fetch('/api/user/scans', { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            if (active) {
              setRecentScans([]);
            }
            return;
          }
          shouldUseStorageFallback = true;
          throw new Error('Failed');
        }
        const data = await res.json();
        const scans = data.scans as RecentScanData[];
        if (!active) return;

        // If we have an initialReportId not in the list, also fetch it individually
        if (initialReportId && !scans.some((s) => s.id === initialReportId)) {
          try {
            const singleRes = await fetch(`/api/scan/${initialReportId}`, { cache: 'no-store' });
            if (singleRes.ok) {
              const singleData = await singleRes.json() as RecentScanData;
              scans.unshift(singleData);
            }
          } catch { /* skip */ }
        }

        const sortedScans = scans
          .filter((entry): entry is RecentScanData => Boolean(entry))
          .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
        setRecentScans(sortedScans);
        recentScansMemoryCache.set(scopeKey, sortedScans);
        if (secondaryStorageScope && secondaryStorageScope !== scopeKey) {
          recentScansMemoryCache.set(secondaryStorageScope, sortedScans);
        }
      } catch {
        if (!shouldUseStorageFallback) {
          return;
        }
        // Fallback to localStorage method
        const fromStorage = getRecentScanEntriesForScopes(scopeKey, secondaryStorageScope).map((entry) => entry.id);
        const ids = [...new Set([...fromStorage, initialReportId].filter(Boolean))];
        if (ids.length === 0) { if (active) { setRecentScans([]); } return; }
        const results = await Promise.all(ids.map(async (scanId) => {
          try { const response = await fetch(`/api/scan/${scanId}`, { cache: 'no-store' }); if (!response.ok) return null; return (await response.json()) as RecentScanData; } catch { return null; }
        }));
        if (!active) return;
        const sortedScans = results
          .filter((entry): entry is RecentScanData => Boolean(entry))
          .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
        setRecentScans(sortedScans);
        recentScansMemoryCache.set(scopeKey, sortedScans);
        if (secondaryStorageScope && secondaryStorageScope !== scopeKey) {
          recentScansMemoryCache.set(secondaryStorageScope, sortedScans);
        }
      } finally {
        if (active) setRecentLoading(false);
      }
    }
    void loadRecentScans();
    return () => { active = false; };
  }, [authLoading, cachedRecentScans, initialReportId, secondaryStorageScope, storageScope]);

  useEffect(() => {
    if (initialReportId) {
      rememberRecentScanForScopes(initialReportId, storageScope, secondaryStorageScope);
    }
  }, [initialReportId, storageScope, secondaryStorageScope]);

  useEffect(() => {
    if (!storageScope || recentLoading) return;
    recentScansMemoryCache.set(storageScope, recentScans);
    if (secondaryStorageScope && secondaryStorageScope !== storageScope) {
      recentScansMemoryCache.set(secondaryStorageScope, recentScans);
    }
  }, [recentLoading, recentScans, storageScope, secondaryStorageScope]);

  // Re-fetch a single scan's metadata and update its entry in recentScans
  const refreshScanEntry = useCallback(async (scanId: string) => {
    try {
      const res = await fetch(`/api/scan/${scanId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as RecentScanData;
      setRecentScans(prev => {
        const exists = prev.some(s => s.id === scanId);
        const updated = exists
          ? prev.map(s => s.id === scanId ? data : s)
          : [data, ...prev];
        return updated.sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
      });
    } catch { /* silently fail */ }
  }, []);

  // Checkout verification
  useEffect(() => {
    const isCheckoutSuccess = searchParams.get('checkout') === 'success';
    const sessionId = searchParams.get('session_id');
    if (!isCheckoutSuccess || !sessionId) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/checkout/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.paid) {
          setPaidOverride(true);
          invalidatePlanCache();
          invalidateBillingStatus();
          const pendingDomainFromStorage = typeof window !== 'undefined'
            ? window.sessionStorage.getItem(PENDING_DOMAIN_STORAGE_KEY)
            : null;
          if (pendingDomainFromStorage) {
            const nextManualDomains = addPendingDomainToManualDomains(manualDomains, pendingDomainFromStorage);
            setManualDomains(nextManualDomains);
            saveStoredDomainsForScopes(nextManualDomains, storageScope, secondaryStorageScope);
            setSelectedDomain(pendingDomainFromStorage);
            setPendingDomain(null);
            window.sessionStorage.removeItem(PENDING_DOMAIN_STORAGE_KEY);
          }
          const domain = initialReportId ? recentScans.find((s) => s.id === initialReportId)?.url : null;
          setCheckoutBanner(`Payment confirmed. Here\u2019s your fix plan${domain ? ` for ${getDomain(domain)}` : ''}.`);
        }
      } catch { /* silently fail */ }
    })();
    return () => { active = false; };
  }, [searchParams, initialReportId, manualDomains, recentScans, setSelectedDomain, storageScope, secondaryStorageScope]);

  // Auto-navigate to Brand > Services tab when arriving with ?fms=start (Fix 3)
  useEffect(() => {
    if (searchParams.get('fms') === 'start') {
      const url = new URL(window.location.href);
      url.searchParams.delete('fms');
      window.history.replaceState({}, '', url.toString());
      window.location.href = '/brand?tab=services';
    }
  }, [searchParams]);

  // Show success banner after Fix My Site payment (Fix 4)
  useEffect(() => {
    if (searchParams.get('fms') === 'success' && searchParams.get('order_id')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('fms');
      url.searchParams.delete('order_id');
      window.history.replaceState({}, '', url.toString());
      setCheckoutBanner('Fix My Site order confirmed! Our team will begin optimizing your site within 1-2 business days.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!checkoutBanner) return;

    const timeoutId = window.setTimeout(() => {
      setCheckoutBanner(null);
    }, CHECKOUT_BANNER_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [checkoutBanner]);

  // --- Computed values ---
  const monitoredSites = useMemo<SiteSummary[]>(() => {
    return buildWorkspaceSiteSummaries({
      hiddenDomains,
      manualDomains,
      monitoringLatestScanAtByDomain,
      recentScans,
      selectedDomain,
    });
  }, [
    hiddenDomains,
    manualDomains,
    monitoringLatestScanAtByDomain,
    recentScans,
    selectedDomain,
  ]);

  const trackedSites = useMemo(
    () => monitoredSites.filter((site) => site.source === 'tracked'),
    [monitoredSites]
  );

  const scannedSites = useMemo(
    () => monitoredSites.filter((site) => site.source === 'scan'),
    [monitoredSites]
  );

  // Auto-select from the authoritative tracked-domain registry once it has reconciled.
  useEffect(() => {
    if (domainsLoading || monitoredSites.length === 0) return;
    if (selectedDomain && monitoredSites.some(s => s.domain === selectedDomain)) return;

    if (initialReportId && recentScans.length > 0) {
      const matchedScan = recentScans.find((scan) => scan.id === initialReportId);
      const matchedDomain = matchedScan ? getDomain(matchedScan.url) : null;
      if (matchedDomain && monitoredSites.some((site) => site.domain === matchedDomain)) {
        setSelectedDomain(matchedDomain, { preserveReport: true });
        return;
      }
    }

    setSelectedDomain(monitoredSites[0].domain);
  }, [domainsLoading, selectedDomain, monitoredSites, initialReportId, recentScans, setSelectedDomain]);

  const expandedSite = monitoredSites.find((s) => s.domain === selectedDomain) ?? null;

  const initialBelongsToSelected = initialReportId && expandedSite
    ? recentScans.some((s) => s.id === initialReportId && getDomain(s.url) === expandedSite.domain)
    : false;
  const activeWorkspaceReportId = initialBelongsToSelected
    ? initialReportId
    : expandedSite?.latestScan?.id ?? expandedSite?.latestPaidScan?.id ?? (!selectedDomain ? initialReportId : '');
  const activeReportId = activeWorkspaceReportId || null;

  // --- Fetch workspace data (with caching) ---
  useEffect(() => {
    if (!activeWorkspaceReportId) {
      setWorkspaceLoading(false);
      setReport(null);
      setFiles(null);
      return;
    }

    const cachedReport = reportCache[activeWorkspaceReportId];
    const cachedFiles = filesCache[activeWorkspaceReportId];
    if (cachedReport) {
      setReport(cachedReport);
      setFiles(cachedFiles ?? null);
      if (!shouldLoadFilesForSection || cachedFiles) {
        setWorkspaceLoading(false);
        return;
      }

      setWorkspaceLoading(true);
      setLoadError('');
      setActionError('');

      let active = true;
      (async () => {
        try {
          const filesRes = await fetch(`/api/scan/${activeWorkspaceReportId}/files`, { cache: 'no-store' });
          if (!filesRes.ok) {
            if (filesRes.status === 403) {
              if (active) setFiles(null);
              return;
            }
            const payload = (await filesRes.json().catch(() => ({}))) as ApiErrorPayload;
            throw new Error(payload.error || 'Failed to load files');
          }

          const filesPayload = (await filesRes.json()) as FilesData;
          if (!active) return;
          setFiles(filesPayload);
          setFilesCache((prev) => ({ ...prev, [activeWorkspaceReportId]: filesPayload }));
        } catch (err) {
          if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load workspace');
        } finally {
          if (active) setWorkspaceLoading(false);
        }
      })();

      return () => { active = false; };
    }

    const shouldPreserveVisibleWorkspace = Boolean(
      report?.url &&
      selectedDomain &&
      getDomain(report.url) === selectedDomain
    );

    setWorkspaceLoading(true);
    setLoadError('');
    setActionError('');
    if (!shouldPreserveVisibleWorkspace) {
      setFiles(null);
      setReport(null);
    }

    let active = true;
    (async () => {
      try {
        const reportRes = await fetch(`/api/scan/${activeWorkspaceReportId}/report`, { cache: 'no-store' });
        if (reportRes.status === 202) {
          const pendingPayload = (await reportRes.json().catch(() => ({}))) as ApiErrorPayload;
          if (!active) return;
          setLoadError(pendingPayload.error || 'Scan not complete');
          return;
        }
        if (!reportRes.ok) { const p = (await reportRes.json().catch(() => ({}))) as ApiErrorPayload; throw new Error(p.error || 'Failed to load report'); }
        const reportPayload = (await reportRes.json()) as DashboardReportData;
        if (!active) return;
        setReport(reportPayload);
        setReportCache((prev) => ({ ...prev, [activeWorkspaceReportId]: reportPayload }));
        void refreshScanEntry(activeWorkspaceReportId);

        if (!shouldLoadFilesForSection) {
          return;
        }

        const filesRes = await fetch(`/api/scan/${activeWorkspaceReportId}/files`, { cache: 'no-store' });
        if (!filesRes.ok) {
          if (filesRes.status === 403) {
            setFiles(null);
            return;
          }
          const p = (await filesRes.json().catch(() => ({}))) as ApiErrorPayload;
          throw new Error(p.error || 'Failed to load files');
        }

        const filesPayload = (await filesRes.json()) as FilesData;
        if (!active) return;
        setFiles(filesPayload);
        setFilesCache((prev) => ({ ...prev, [activeWorkspaceReportId]: filesPayload }));
      } catch (err) { if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load workspace'); } finally { if (active) setWorkspaceLoading(false); }
    })();
    return () => { active = false; };
  }, [activeWorkspaceReportId, shouldLoadFilesForSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const shouldPollLoadedReport =
    Boolean(
      report?.enrichments?.webHealth?.status === 'running' ||
      report?.enrichments?.aiMentions?.status === 'running'
    );

  // Poll while a rescan is in progress or while web-health enrichment is still finalizing.
  useEffect(() => {
    if (!activeWorkspaceReportId) return;
    if (loadError !== 'Scan not complete' && !shouldPollLoadedReport) return;

    const interval = setInterval(async () => {
      try {
        if (loadError === 'Scan not complete') {
          const scanRes = await fetch(`/api/scan/${activeWorkspaceReportId}`, { cache: 'no-store' });
          if (!scanRes.ok) return;
          const scanPayload = await scanRes.json() as RecentScanData & { status?: string; progress?: { error?: string } };
          if (scanPayload.status === 'failed') {
            setLoadError(scanPayload.progress?.error || 'Scan failed');
            void refreshScanEntry(activeWorkspaceReportId);
            return;
          }
          if (scanPayload.status !== 'complete') {
            return;
          }
        }

        const reportRes = await fetch(`/api/scan/${activeWorkspaceReportId}/report`, { cache: 'no-store' });
        if (reportRes.status === 202) {
          setLoadError('Scan not complete');
          return;
        }
        if (!reportRes.ok) {
          const p = (await reportRes.json().catch(() => ({}))) as ApiErrorPayload;
          if (p.error !== 'Scan not complete') setLoadError(p.error || 'Failed to load report');
          return;
        }
        const reportPayload = (await reportRes.json()) as DashboardReportData;
        setReport(reportPayload);
        setReportCache((prev) => ({ ...prev, [activeWorkspaceReportId]: reportPayload }));
        setLoadError('');
        void refreshScanEntry(activeWorkspaceReportId);

        if (!shouldLoadFilesForSection) {
          return;
        }

        const filesRes = await fetch(`/api/scan/${activeWorkspaceReportId}/files`, { cache: 'no-store' });
        if (filesRes.ok) {
          const filesPayload = (await filesRes.json()) as FilesData;
          setFiles(filesPayload);
          setFilesCache((prev) => ({ ...prev, [activeWorkspaceReportId]: filesPayload }));
        }
      } catch {
        // Keep polling on transient errors
      }
    }, loadError === 'Scan not complete' ? 3500 : 2500);
    return () => clearInterval(interval);
  }, [loadError, activeWorkspaceReportId, refreshScanEntry, shouldLoadFilesForSection, shouldPollLoadedReport]);
 
  // Use plan tier for paid access instead of scan-level flags
  const hasPaidAccess = debugPaidPreview || planIsPaid || paidOverride || Boolean(report?.hasPaid) || recentScans.some((s) => s.hasPaid);
  const normalizedDomain = normalizeDomainInput(addDomainInput);
  const inputFaviconUrl = useMemo(() => {
    if (!addDomainInput.trim()) return null;
    try { const domain = getDomain(ensureProtocol(addDomainInput)); return domain.includes('.') ? getFaviconUrl(domain, 32) : null; } catch { return null; }
  }, [addDomainInput]);

  // --- Handlers ---
  const selectDomain = useCallback((domain: string) => {
    setSelectedDomain(domain);
  }, [setSelectedDomain]);

  const addTrackedDomain = useCallback(async (domain: string) => {
    const normalized = normalizeDomainInput(domain);
    if (!normalized) {
      return { ok: false, error: 'Please enter a domain' };
    }
    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(normalized)) {
      return { ok: false, error: 'Please enter a valid domain (e.g. example.com)' };
    }
    if (manualDomains.includes(normalized)) {
      return { ok: false, error: 'This domain is already being monitored' };
    }

    try {
      const res = await fetch('/api/user/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: normalized }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403) {
          setPendingDomain(normalized);
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(PENDING_DOMAIN_STORAGE_KEY, normalized);
          }
          setUnlockModalOpen(true);
        }
        return { ok: false, error: data.error || 'Failed to add domain' };
      }
    } catch {
      return { ok: false, error: 'Failed to save domain. Please try again.' };
    }

    const nextManual = manualDomains.includes(normalized) ? manualDomains : [...manualDomains, normalized];
    setManualDomains(nextManual);
    saveStoredDomainsForScopes(nextManual, storageScope, secondaryStorageScope);
    const nextHidden = hiddenDomains.filter((d) => d !== normalized);
    setHiddenDomains(nextHidden);
    saveHiddenDomainsForScopes(nextHidden, storageScope, secondaryStorageScope);
    if (storageScope) {
      domainListMemoryCache.set(storageScope, {
        manualDomains: nextManual,
        hiddenDomains: nextHidden,
      });
      if (secondaryStorageScope && secondaryStorageScope !== storageScope) {
        domainListMemoryCache.set(secondaryStorageScope, {
          manualDomains: nextManual,
          hiddenDomains: nextHidden,
        });
      }
    }
    const matchingPaidScan = getLatestPaidScanByDomain(recentScans, normalized);
    if (matchingPaidScan) {
      try {
        const res = await fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scanId: matchingPaidScan.id, alertThreshold: 5 }),
        });
        if (res.ok) {
          setMonitoringConnected((c) => {
            const next = { ...c, [normalized]: true };
            if (storageScope) {
              monitoringMemoryCache.set(storageScope, {
                connected: next,
                latestScanAtByDomain: monitoringLatestScanAtByDomain,
              });
              if (secondaryStorageScope && secondaryStorageScope !== storageScope) {
                monitoringMemoryCache.set(secondaryStorageScope, {
                  connected: next,
                  latestScanAtByDomain: monitoringLatestScanAtByDomain,
                });
              }
            }
            return next;
          });
        }
      } catch { /* silently fail */ }
    }
    setPendingDomain(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(PENDING_DOMAIN_STORAGE_KEY);
    }
    setSelectedDomain(normalized);
    return { ok: true };
  }, [manualDomains, hiddenDomains, monitoringLatestScanAtByDomain, recentScans, setSelectedDomain, storageScope, secondaryStorageScope]);

  const handleAddDomain = useCallback(async () => {
    setAddError(null);
    setActionError('');
    if (!normalizedDomain) {
      const error = 'Please enter a domain';
      setAddError(error);
      return { ok: false, error };
    }
    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(normalizedDomain)) {
      const error = 'Please enter a valid domain (e.g. example.com)';
      setAddError(error);
      return { ok: false, error };
    }
    if (manualDomains.includes(normalizedDomain)) {
      const error = 'This domain is already being monitored';
      setAddError(error);
      return { ok: false, error };
    }
    if (!confirmChecked) {
      const error = 'Please confirm domain ownership';
      setAddError(error);
      return { ok: false, error };
    }

    const result = await addTrackedDomain(normalizedDomain);
    if (!result.ok) {
      setAddError(result.error || 'Failed to add domain');
      return result;
    }

    setAddDomainInput('');
    setConfirmChecked(false);

    // Always auto-start a scan after adding a domain
    setScanAutoStarting(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedDomain }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to start scan');
      }

      rememberRecentScanForScopes(payload.id, storageScope, secondaryStorageScope);
      router.replace(`/dashboard?report=${payload.id}&domain=${encodeURIComponent(normalizedDomain)}`);
      return { ok: true };
    } catch (err) {
      setScanAutoStarting(false);
      const message = err instanceof Error ? err.message : 'Failed to start scan';
      setActionError(message);
      router.replace(`/dashboard?domain=${encodeURIComponent(normalizedDomain)}`);
      return { ok: true, error: message };
    }
  }, [normalizedDomain, manualDomains, confirmChecked, addTrackedDomain, storageScope, secondaryStorageScope, router]);

  const handleRemoveDomain = useCallback((domain: string) => {
    // Write-through to DB
    fetch('/api/user/domains', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    }).catch(() => { /* best-effort */ });

    const nextManual = manualDomains.filter((e) => e !== domain);
    const nextHidden = hiddenDomains.includes(domain) ? hiddenDomains : [...hiddenDomains, domain];
    setManualDomains(nextManual); saveStoredDomainsForScopes(nextManual, storageScope, secondaryStorageScope); setHiddenDomains(nextHidden); saveHiddenDomainsForScopes(nextHidden, storageScope, secondaryStorageScope);
    if (storageScope) {
      domainListMemoryCache.set(storageScope, {
        manualDomains: nextManual,
        hiddenDomains: nextHidden,
      });
      if (secondaryStorageScope && secondaryStorageScope !== storageScope) {
        domainListMemoryCache.set(secondaryStorageScope, {
          manualDomains: nextManual,
          hiddenDomains: nextHidden,
        });
      }
    }
    if (selectedDomain === domain) setSelectedDomain(null);
  }, [manualDomains, hiddenDomains, selectedDomain, setSelectedDomain, storageScope, secondaryStorageScope]);

  const handleUnlockComplete = useCallback((plan?: string) => {
    const selectedPlan = plan || 'starter_monthly';
    const scanId = pendingDomain ? `upgrade_${pendingDomain}` : `upgrade_direct`;
    (async () => {
      setUnlockLoading(true);
      setActionError('');
      try {
        if (pendingDomain && typeof window !== 'undefined') {
          window.sessionStorage.setItem(PENDING_DOMAIN_STORAGE_KEY, pendingDomain);
        }
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scanId,
            plan: selectedPlan,
            returnPath: getCurrentAppPath('/dashboard'),
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to start checkout right now.');
        }
        const session = await res.json();
        if (session.url) {
          if (session.url.startsWith('/checkout/')) {
            const verifyRes = await fetch('/api/checkout/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.id }) });
            const verifyPayload = await verifyRes.json().catch(() => ({}));
            if (!verifyRes.ok || !verifyPayload.paid) {
              throw new Error(verifyPayload.error || 'Unable to confirm your payment right now.');
            }

            setPaidOverride(true);
            invalidatePlanCache();
            invalidateBillingStatus();
            const nextManual = addPendingDomainToManualDomains(manualDomains, pendingDomain);
            setManualDomains(nextManual);
            saveStoredDomainsForScopes(nextManual, storageScope, secondaryStorageScope);
            if (pendingDomain) setSelectedDomain(pendingDomain);
            setPendingDomain(null);
            if (typeof window !== 'undefined') {
              window.sessionStorage.removeItem(PENDING_DOMAIN_STORAGE_KEY);
            }
            setUnlockModalOpen(false);
            setAddDomainInput('');
            setCheckoutBanner('Payment confirmed! Your plan has been upgraded.');
            return;
          }

          window.location.href = session.url;
          return;
        }

        throw new Error('Checkout session did not include a redirect URL.');
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Unable to start checkout right now.');
      } finally {
        setUnlockLoading(false);
      }
    })();
  }, [pendingDomain, manualDomains, setSelectedDomain, storageScope, secondaryStorageScope]);

  // Auto-trigger checkout when arriving from pricing page with ?upgrade= param (Fix 1)
  useEffect(() => {
    const upgradePlan = searchParams.get('upgrade');
    if (!upgradePlan) return;
    // Prevent re-triggering
    const url = new URL(window.location.href);
    url.searchParams.delete('upgrade');
    window.history.replaceState({}, '', url.toString());
    // Reuse existing checkout handler
    handleUnlockComplete(upgradePlan);
  }, [searchParams, handleUnlockComplete]);

  const handleRunFirstScan = useCallback(async (site: SiteSummary) => {
    setActionError('');
    try { const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: site.url }) }); const payload = await res.json(); if (!res.ok) throw new Error(payload.error || 'Failed to start scan'); rememberRecentScanForScopes(payload.id, storageScope, secondaryStorageScope); router.push(`/dashboard?report=${payload.id}&domain=${encodeURIComponent(site.domain)}`); } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to start scan'); }
  }, [router, storageScope, secondaryStorageScope]);

  const handleReaudit = useCallback(async () => {
    const scanUrl = files?.url ?? report?.url ?? (expandedSite ? expandedSite.url : null);
    if (!scanUrl) return;
    const scanDomain = expandedSite?.domain ?? getDomain(scanUrl);
    setActionError(''); setReauditLoading(true);
    try {
      const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: scanUrl, force: true }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to start scan');
      rememberRecentScanForScopes(payload.id, storageScope, secondaryStorageScope);
      const newScanEntry: RecentScanData = {
        id: payload.id,
        url: scanUrl,
        status: 'pending',
        hasEmail: true,
        hasPaid: Boolean(expandedSite?.latestPaidScan),
        createdAt: Date.now(),
      };
      setRecentScans((prev) => [newScanEntry, ...prev]);
      setLoadError('');
      setWorkspaceLoading(true);
      router.push(`/dashboard?report=${payload.id}&domain=${encodeURIComponent(scanDomain)}`);
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to start scan'); } finally { setReauditLoading(false); }
  }, [files?.url, report?.url, expandedSite, router, storageScope, secondaryStorageScope]);

  const handleEnableMonitoring = useCallback(async () => {
    if (!expandedSite?.domain) return;
    const monitoringScan = getLatestMonitorableScanByDomain(recentScans, expandedSite.domain, hasPaidAccess);
    if (!monitoringScan?.id) {
      setActionError('Run a scan for this domain before enabling monitoring.');
      return;
    }
    setMonitoringLoading(true); setActionError('');
    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: monitoringScan.id, alertThreshold: 5 }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to enable monitoring');
      setMonitoringConnected((c) => {
        const next = { ...c, [expandedSite.domain]: true };
        if (storageScope) {
          monitoringMemoryCache.set(storageScope, {
            connected: next,
            latestScanAtByDomain: monitoringLatestScanAtByDomain,
          });
          if (secondaryStorageScope && secondaryStorageScope !== storageScope) {
            monitoringMemoryCache.set(secondaryStorageScope, {
              connected: next,
              latestScanAtByDomain: monitoringLatestScanAtByDomain,
            });
          }
        }
        return next;
      });
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to enable monitoring'); } finally { setMonitoringLoading(false); }
  }, [expandedSite, hasPaidAccess, monitoringLatestScanAtByDomain, recentScans, storageScope, secondaryStorageScope]);

  const handleDisableMonitoring = useCallback(async () => {
    if (!expandedSite?.domain) return;
    setMonitoringLoading(true); setActionError('');
    try {
      const res = await fetch(`/api/monitoring/${encodeURIComponent(expandedSite.domain)}`, { method: 'DELETE' });
      if (!res.ok) { const payload = await res.json().catch(() => ({})); throw new Error(payload.error || 'Failed to disable monitoring'); }
      setMonitoringConnected((c) => {
        const next = { ...c };
        delete next[expandedSite.domain];
        if (storageScope) {
          monitoringMemoryCache.set(storageScope, {
            connected: next,
            latestScanAtByDomain: monitoringLatestScanAtByDomain,
          });
          if (secondaryStorageScope && secondaryStorageScope !== storageScope) {
            monitoringMemoryCache.set(secondaryStorageScope, {
              connected: next,
              latestScanAtByDomain: monitoringLatestScanAtByDomain,
            });
          }
        }
        return next;
      });
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to disable monitoring'); } finally { setMonitoringLoading(false); }
  }, [expandedSite, monitoringLatestScanAtByDomain, storageScope, secondaryStorageScope]);

  const value = useMemo<DomainContextValue>(() => ({
    monitoredSites,
    trackedSites,
    scannedSites,
    selectedDomain,
    activeReportId,
    selectDomain,
    addDomainInput,
    setAddDomainInput: (v: string) => { setAddDomainInput(v); setAddError(null); },
    handleAddDomain,
    addTrackedDomain,
    handleRemoveDomain,
    addError,
    confirmChecked,
    setConfirmChecked,
    scanAutoStarting,
    hasPaidAccess,
    report,
    files,
    workspaceLoading,
    loadError,
    recentScans,
    domainsLoading,
    recentLoading,
    expandedSite,
    actionError,
    reauditLoading,
    handleReaudit,
    handleRunFirstScan,
    monitoringConnected,
    monitoringLoading,
    handleEnableMonitoring,
    handleDisableMonitoring,
    unlockModalOpen,
    setUnlockModalOpen,
    handleUnlockComplete,
    unlockLoading,
    pendingDomain,
    paidOverride,
    debugPaidPreview,
    checkoutBanner,
    dismissCheckoutBanner,
    inputFaviconUrl,
  }), [
    monitoredSites, trackedSites, scannedSites, selectedDomain, activeReportId, selectDomain, addDomainInput, handleAddDomain, addTrackedDomain, handleRemoveDomain,
    addError, confirmChecked, scanAutoStarting, hasPaidAccess, report, files, workspaceLoading, loadError, recentScans,
    domainsLoading, recentLoading, expandedSite, actionError, reauditLoading, handleReaudit, handleRunFirstScan,
    monitoringConnected, monitoringLoading, handleEnableMonitoring, handleDisableMonitoring, unlockModalOpen, handleUnlockComplete,
    unlockLoading, pendingDomain, paidOverride, debugPaidPreview, checkoutBanner, dismissCheckoutBanner, inputFaviconUrl,
  ]);

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  );
}
