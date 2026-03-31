'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ensureProtocol, getDomain, getFaviconUrl } from '@/lib/url-utils';
import { getRecentScanEntries, rememberRecentScan } from '@/lib/recent-scans';
import { invalidateBillingStatus } from '@/hooks/use-billing-status';
import { invalidatePlanCache, usePlan } from '@/hooks/use-plan';
import { getCurrentAppPath } from '@/lib/app-paths';
import { useAuth } from '@/hooks/use-auth';
import {
  loadStoredDomains,
  saveStoredDomains,
  loadHiddenDomains,
  saveHiddenDomains,
} from '@/app/advanced/lib/storage';
import {
  normalizeDomainInput,
  getLatestScanByDomain,
  getLatestPaidScanByDomain,
} from '@/app/advanced/lib/utils';
import {
  addPendingDomainToManualDomains,
  reconcileHiddenDomains,
} from '@/lib/workspace-ui';

import type { DashboardReportData, FilesData, RecentScanData, SiteSummary, ApiErrorPayload } from '@/app/advanced/lib/types';

interface DomainContextValue {
  // Domain list
  monitoredSites: SiteSummary[];
  trackedSites: SiteSummary[];
  scannedSites: SiteSummary[];
  selectedDomain: string | null;
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

  // Workspace data
  hasPaidAccess: boolean;
  report: DashboardReportData | null;
  files: FilesData | null;
  workspaceLoading: boolean;
  loadError: string;
  recentScans: RecentScanData[];
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
const CHECKOUT_BANNER_DURATION_MS = 12000;

export function useDomainContext() {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error('useDomainContext must be used within DomainContextProvider');
  return ctx;
}

export function DomainContextProvider({
  reportId,
  children,
}: {
  reportId: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReportId = reportId ?? '';
  const debugPaidPreview = process.env.NODE_ENV === 'development' && searchParams.get('debugPaid') === '1';
  const { isPaid: planIsPaid } = usePlan();
  const { user: authUser } = useAuth();
  const storageScope = authUser?.id ?? authUser?.email ?? null;
  const prefilledDomain = normalizeDomainInput(searchParams.get('prefillDomain') ?? '');
  const shouldAutoStartPrefilledScan = searchParams.get('autoStart') === '1' && Boolean(prefilledDomain);

  const [recentScans, setRecentScans] = useState<RecentScanData[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [manualDomains, setManualDomains] = useState<string[]>([]);
  const [hiddenDomains, setHiddenDomains] = useState<string[]>([]);
  const [paidOverride, setPaidOverride] = useState(false);
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);
  const domainParam = searchParams.get('domain');
  const [selectedDomain, setSelectedDomainRaw] = useState<string | null>(domainParam);
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
  const [monitoringConnected, setMonitoringConnected] = useState<Record<string, boolean>>({});
  const [addDomainInput, setAddDomainInput] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!prefilledDomain) return;
    if (manualDomains.length > 0) return;
    setAddDomainInput((current) => current.trim() ? current : prefilledDomain);
  }, [prefilledDomain, manualDomains.length]);

  // Persist selected domain in URL so refresh restores it
  const setSelectedDomain = useCallback((domain: string | null) => {
    setSelectedDomainRaw(domain);
    const params = new URLSearchParams(window.location.search);
    if (domain) {
      params.set('domain', domain);
    } else {
      params.delete('domain');
    }
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, []);
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
      return;
    }

    setManualDomains(loadStoredDomains(storageScope));
    setHiddenDomains(loadHiddenDomains(storageScope));

    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/user/domains');
        if (!res.ok) return;
        const data = await res.json();
        const dbDomains: string[] = (data.domains ?? []).map((d: { domain: string }) => d.domain);
        if (!active) return;

        setManualDomains(dbDomains);
        saveStoredDomains(dbDomains, storageScope);
        const nextHiddenDomains = reconcileHiddenDomains(loadHiddenDomains(storageScope), dbDomains);
        setHiddenDomains(nextHiddenDomains);
        saveHiddenDomains(nextHiddenDomains, storageScope);
      } catch { /* keep localStorage data on network failure */ }
    })();

    return () => { active = false; };
  }, [storageScope]);

  // --- Hydrate monitoring status from DB ---
  useEffect(() => {
    if (!storageScope) {
      setMonitoringConnected({});
      return;
    }

    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/monitoring');
        if (!res.ok) return;
        const data = await res.json();
        const domains: Array<{ domain: string; status: string }> = data.domains ?? [];
        if (!active) return;
        const connected: Record<string, boolean> = {};
        for (const d of domains) {
          if (d.status === 'active') {
            connected[d.domain] = true;
          }
        }
        setMonitoringConnected(prev => ({ ...prev, ...connected }));
      } catch { /* keep current state on failure */ }
    })();
    return () => { active = false; };
  }, [storageScope]);

  // --- Load recent scans from DB API ---
  useEffect(() => {
    if (!storageScope) {
      setRecentScans([]);
      setRecentLoading(false);
      return;
    }

    let active = true;
    setRecentLoading(true);
    async function loadRecentScans() {
      let shouldUseStorageFallback = false;
      try {
        const res = await fetch('/api/user/scans');
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
            const singleRes = await fetch(`/api/scan/${initialReportId}`);
            if (singleRes.ok) {
              const singleData = await singleRes.json() as RecentScanData;
              scans.unshift(singleData);
            }
          } catch { /* skip */ }
        }

        setRecentScans(
          scans
            .filter((entry): entry is RecentScanData => Boolean(entry))
            .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
        );
      } catch {
        if (!shouldUseStorageFallback) {
          return;
        }
        // Fallback to localStorage method
        const fromStorage = getRecentScanEntries(storageScope).map((entry) => entry.id);
        const ids = [...new Set([...fromStorage, initialReportId].filter(Boolean))];
        if (ids.length === 0) { if (active) { setRecentScans([]); } return; }
        const results = await Promise.all(ids.map(async (scanId) => {
          try { const response = await fetch(`/api/scan/${scanId}`); if (!response.ok) return null; return (await response.json()) as RecentScanData; } catch { return null; }
        }));
        if (!active) return;
        setRecentScans(results.filter((entry): entry is RecentScanData => Boolean(entry)).sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt)));
      } finally {
        if (active) setRecentLoading(false);
      }
    }
    void loadRecentScans();
    return () => { active = false; };
  }, [initialReportId, storageScope]);

  useEffect(() => { if (initialReportId) rememberRecentScan(initialReportId, storageScope); }, [initialReportId, storageScope]);

  // Re-fetch a single scan's metadata and update its entry in recentScans
  const refreshScanEntry = useCallback(async (scanId: string) => {
    try {
      const res = await fetch(`/api/scan/${scanId}`);
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
            saveStoredDomains(nextManualDomains, storageScope);
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
  }, [searchParams, initialReportId, manualDomains, recentScans, setSelectedDomain, storageScope]);

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
  const paidDomains = useMemo(() => {
    const seen = new Set<string>();
    return recentScans.reduce<string[]>((domains, scan) => {
      if (!scan.hasPaid) return domains;
      const domain = getDomain(scan.url);
      if (hiddenDomains.includes(domain) || seen.has(domain)) return domains;
      seen.add(domain); domains.push(domain); return domains;
    }, []);
  }, [recentScans, hiddenDomains]);

  const monitoredSites = useMemo<SiteSummary[]>(() => {
    const domains = new Set<string>();
    const addDomain = (domain: string) => { if (!domain || hiddenDomains.includes(domain)) return; domains.add(domain); };
    paidDomains.forEach(addDomain);
    manualDomains.forEach(addDomain);
    if (report?.url) addDomain(getDomain(report.url));
    if (initialReportId) {
      const match = recentScans.find((s) => s.id === initialReportId);
      if (match) addDomain(getDomain(match.url));
    }
    return [...domains].map<SiteSummary>((domain) => {
      const latestScan = getLatestScanByDomain(recentScans, domain);
      const latestPaidScan = getLatestPaidScanByDomain(recentScans, domain);
      const lastTouchedAt = Math.max(latestPaidScan?.completedAt ?? 0, latestPaidScan?.createdAt ?? 0, latestScan?.completedAt ?? 0, latestScan?.createdAt ?? 0) || null;
      return {
        domain,
        url: latestPaidScan?.url ?? latestScan?.url ?? `https://${domain}`,
        latestScan,
        latestPaidScan,
        lastTouchedAt,
        source: manualDomains.includes(domain) ? 'tracked' : 'scan',
      };
    }).sort((a, b) => (b.lastTouchedAt ?? 0) - (a.lastTouchedAt ?? 0));
  }, [hiddenDomains, manualDomains, paidDomains, recentScans, report?.url, initialReportId]);

  const trackedSites = useMemo(
    () => monitoredSites.filter((site) => site.source === 'tracked'),
    [monitoredSites]
  );

  const scannedSites = useMemo(
    () => monitoredSites.filter((site) => site.source === 'scan'),
    [monitoredSites]
  );

  // Auto-select domain when none selected (or URL param domain not in list)
  useEffect(() => {
    if (recentLoading || monitoredSites.length === 0) return;
    // If already selected and the domain exists in the list, keep it
    if (selectedDomain && monitoredSites.some(s => s.domain === selectedDomain)) return;
    // Try to match initialReportId
    if (initialReportId && recentScans.length > 0) {
      const matchedScan = recentScans.find((scan) => scan.id === initialReportId);
      if (matchedScan) {
        setSelectedDomain(getDomain(matchedScan.url));
        return;
      }
    }
    setSelectedDomain(monitoredSites[0].domain);
  }, [selectedDomain, monitoredSites, recentLoading, initialReportId, recentScans, setSelectedDomain]);

  const expandedSite = monitoredSites.find((s) => s.domain === selectedDomain) ?? null;

  const initialBelongsToSelected = initialReportId && expandedSite
    ? recentScans.some((s) => s.id === initialReportId && getDomain(s.url) === expandedSite.domain)
    : false;
  const activeWorkspaceReportId = initialBelongsToSelected
    ? initialReportId
    : expandedSite?.latestScan?.id ?? expandedSite?.latestPaidScan?.id ?? (initialReportId || '');

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
      setWorkspaceLoading(false);
      return;
    }

    setWorkspaceLoading(true);
    setLoadError(''); setActionError(''); setFiles(null); setReport(null);

    let active = true;
    (async () => {
      try {
        const reportRes = await fetch(`/api/scan/${activeWorkspaceReportId}/report`);
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

        const filesRes = await fetch(`/api/scan/${activeWorkspaceReportId}/files`);
        if (!filesRes.ok) { if (filesRes.status === 403) { setFiles(null); return; } const p = (await filesRes.json().catch(() => ({}))) as ApiErrorPayload; throw new Error(p.error || 'Failed to load files'); }
        const filesPayload = (await filesRes.json()) as FilesData;
        if (!active) return;
        setFiles(filesPayload);
        setFilesCache((prev) => ({ ...prev, [activeWorkspaceReportId]: filesPayload }));
      } catch (err) { if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load workspace'); } finally { if (active) setWorkspaceLoading(false); }
    })();
    return () => { active = false; };
  }, [activeWorkspaceReportId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          const scanRes = await fetch(`/api/scan/${activeWorkspaceReportId}`);
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

        const reportRes = await fetch(`/api/scan/${activeWorkspaceReportId}/report`);
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
        const filesRes = await fetch(`/api/scan/${activeWorkspaceReportId}/files`);
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
  }, [loadError, activeWorkspaceReportId, refreshScanEntry, shouldPollLoadedReport]);

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
    saveStoredDomains(nextManual, storageScope);
    const nextHidden = hiddenDomains.filter((d) => d !== normalized);
    setHiddenDomains(nextHidden);
    saveHiddenDomains(nextHidden, storageScope);
    const matchingPaidScan = getLatestPaidScanByDomain(recentScans, normalized);
    if (matchingPaidScan) {
      try {
        const res = await fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scanId: matchingPaidScan.id, alertThreshold: 5 }),
        });
        if (res.ok) {
          setMonitoringConnected((c) => ({ ...c, [normalized]: true }));
        }
      } catch { /* silently fail */ }
    }
    setPendingDomain(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(PENDING_DOMAIN_STORAGE_KEY);
    }
    setSelectedDomain(normalized);
    return { ok: true };
  }, [manualDomains, hiddenDomains, recentScans, setSelectedDomain, storageScope]);

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

    if (shouldAutoStartPrefilledScan) {
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

        rememberRecentScan(payload.id, storageScope);
        router.replace(`/report?report=${payload.id}`);
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start scan';
        setActionError(message);
        router.replace(`/report?domain=${encodeURIComponent(normalizedDomain)}`);
        return { ok: true, error: message };
      }
    }

    return result;
  }, [normalizedDomain, manualDomains, confirmChecked, addTrackedDomain, shouldAutoStartPrefilledScan, storageScope, router]);

  const handleRemoveDomain = useCallback((domain: string) => {
    // Write-through to DB
    fetch('/api/user/domains', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    }).catch(() => { /* best-effort */ });

    const nextManual = manualDomains.filter((e) => e !== domain);
    const nextHidden = hiddenDomains.includes(domain) ? hiddenDomains : [...hiddenDomains, domain];
    setManualDomains(nextManual); saveStoredDomains(nextManual, storageScope); setHiddenDomains(nextHidden); saveHiddenDomains(nextHidden, storageScope);
    if (selectedDomain === domain) setSelectedDomain(null);
  }, [manualDomains, hiddenDomains, selectedDomain, setSelectedDomain, storageScope]);

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
            saveStoredDomains(nextManual, storageScope);
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
  }, [pendingDomain, manualDomains, setSelectedDomain, storageScope]);

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
    try { const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: site.url }) }); const payload = await res.json(); if (!res.ok) throw new Error(payload.error || 'Failed to start scan'); rememberRecentScan(payload.id, storageScope); router.push(`/report?report=${payload.id}`); } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to start scan'); }
  }, [router, storageScope]);

  const handleReaudit = useCallback(async () => {
    const scanUrl = files?.url ?? report?.url ?? (expandedSite ? expandedSite.url : null);
    if (!scanUrl) return;
    setActionError(''); setReauditLoading(true);
    try {
      const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: scanUrl, force: true }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to start scan');
      rememberRecentScan(payload.id, storageScope);
      const newScanEntry: RecentScanData = {
        id: payload.id,
        url: scanUrl,
        status: 'pending',
        hasEmail: true,
        hasPaid: Boolean(expandedSite?.latestPaidScan),
        createdAt: Date.now(),
      };
      setRecentScans((prev) => [newScanEntry, ...prev]);
      setReport(null); setFiles(null); setLoadError(''); setWorkspaceLoading(true);
      setReportCache({}); setFilesCache({});
      router.push(`/report?report=${payload.id}`);
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to start scan'); } finally { setReauditLoading(false); }
  }, [files?.url, report?.url, expandedSite, router, storageScope]);

  const handleEnableMonitoring = useCallback(async () => {
    if (!expandedSite?.latestPaidScan?.id) return;
    setMonitoringLoading(true); setActionError('');
    try { const res = await fetch('/api/monitoring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scanId: expandedSite.latestPaidScan.id, alertThreshold: 5 }) }); const payload = await res.json(); if (!res.ok) throw new Error(payload.error || 'Failed to enable monitoring'); setMonitoringConnected((c) => ({ ...c, [expandedSite.domain]: true })); } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to enable monitoring'); } finally { setMonitoringLoading(false); }
  }, [expandedSite]);

  const handleDisableMonitoring = useCallback(async () => {
    if (!expandedSite?.domain) return;
    setMonitoringLoading(true); setActionError('');
    try {
      const res = await fetch(`/api/monitoring/${encodeURIComponent(expandedSite.domain)}`, { method: 'DELETE' });
      if (!res.ok) { const payload = await res.json().catch(() => ({})); throw new Error(payload.error || 'Failed to disable monitoring'); }
      setMonitoringConnected((c) => { const next = { ...c }; delete next[expandedSite.domain]; return next; });
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to disable monitoring'); } finally { setMonitoringLoading(false); }
  }, [expandedSite]);

  const value = useMemo<DomainContextValue>(() => ({
    monitoredSites,
    trackedSites,
    scannedSites,
    selectedDomain,
    selectDomain,
    addDomainInput,
    setAddDomainInput: (v: string) => { setAddDomainInput(v); setAddError(null); },
    handleAddDomain,
    addTrackedDomain,
    handleRemoveDomain,
    addError,
    confirmChecked,
    setConfirmChecked,
    hasPaidAccess,
    report,
    files,
    workspaceLoading,
    loadError,
    recentScans,
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
    monitoredSites, trackedSites, scannedSites, selectedDomain, selectDomain, addDomainInput, handleAddDomain, addTrackedDomain, handleRemoveDomain,
    addError, confirmChecked, hasPaidAccess, report, files, workspaceLoading, loadError, recentScans,
    recentLoading, expandedSite, actionError, reauditLoading, handleReaudit, handleRunFirstScan,
    monitoringConnected, monitoringLoading, handleEnableMonitoring, handleDisableMonitoring, unlockModalOpen, handleUnlockComplete,
    unlockLoading, pendingDomain, paidOverride, debugPaidPreview, checkoutBanner, dismissCheckoutBanner, inputFaviconUrl,
  ]);

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  );
}
