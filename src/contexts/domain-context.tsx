'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ensureProtocol, getDomain, getFaviconUrl } from '@/lib/url-utils';
import { getRecentScanEntries, rememberRecentScan } from '@/lib/recent-scans';
import { ADVANCED_PAID_PREVIEW_KEY } from '@/app/advanced/lib/constants';
import {
  loadStoredDomains,
  saveStoredDomains,
  loadHiddenDomains,
  saveHiddenDomains,
  loadStoredBoolean,
  saveStoredBoolean,
} from '@/app/advanced/lib/storage';
import {
  normalizeDomainInput,
  getLatestScanByDomain,
  getLatestPaidScanByDomain,
} from '@/app/advanced/lib/utils';

import type { DashboardReportData, FilesData, RecentScanData, SiteSummary, ApiErrorPayload } from '@/app/advanced/lib/types';

interface DomainContextValue {
  // Domain list
  monitoredSites: SiteSummary[];
  selectedDomain: string | null;
  selectDomain: (domain: string) => void;

  // Add domain
  addDomainInput: string;
  setAddDomainInput: (v: string) => void;
  handleAddDomain: () => Promise<void>;
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

  // Unlock
  unlockModalOpen: boolean;
  setUnlockModalOpen: (v: boolean) => void;
  handleUnlockComplete: () => void;
  pendingDomain: string | null;
  paidOverride: boolean;
  debugPaidPreview: boolean;
  checkoutBanner: string | null;
  inputFaviconUrl: string | null;
}

const DomainContext = createContext<DomainContextValue | null>(null);

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
  const debugPaidPreview = searchParams.get('debugPaid') === '1';

  const [recentScans, setRecentScans] = useState<RecentScanData[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [manualDomains, setManualDomains] = useState<string[]>([]);
  const [hiddenDomains, setHiddenDomains] = useState<string[]>([]);
  const [paidOverride, setPaidOverride] = useState(false);
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [files, setFiles] = useState<FilesData | null>(null);
  const [report, setReport] = useState<DashboardReportData | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
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

  // Caches for instant domain switching
  const [reportCache, setReportCache] = useState<Record<string, DashboardReportData>>({});
  const [filesCache, setFilesCache] = useState<Record<string, FilesData>>({});

  // --- Load initial data ---
  useEffect(() => {
    setManualDomains(loadStoredDomains());
    setHiddenDomains(loadHiddenDomains());
    setPaidOverride(loadStoredBoolean(ADVANCED_PAID_PREVIEW_KEY));
  }, []);

  useEffect(() => {
    let active = true;
    async function loadRecentScans() {
      const ids = getRecentScanEntries().map((entry) => entry.id);
      if (ids.length === 0) { if (active) { setRecentScans([]); setRecentLoading(false); } return; }
      try {
        const results = await Promise.all(ids.map(async (scanId) => {
          try { const response = await fetch(`/api/scan/${scanId}`); if (!response.ok) return null; return (await response.json()) as RecentScanData; } catch { return null; }
        }));
        if (!active) return;
        setRecentScans(results.filter((entry): entry is RecentScanData => Boolean(entry)).sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt)));
      } finally { if (active) setRecentLoading(false); }
    }
    void loadRecentScans();
    return () => { active = false; };
  }, []);

  useEffect(() => { if (initialReportId) rememberRecentScan(initialReportId); }, [initialReportId]);

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
          const domain = initialReportId ? recentScans.find((s) => s.id === initialReportId)?.url : null;
          setCheckoutBanner(`Payment confirmed. Here\u2019s your fix plan${domain ? ` for ${getDomain(domain)}` : ''}.`);
        }
      } catch { /* silently fail */ }
    })();
    return () => { active = false; };
  }, [searchParams, initialReportId, recentScans]);

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
    return [...domains].map<SiteSummary>((domain) => {
      const latestScan = getLatestScanByDomain(recentScans, domain);
      const latestPaidScan = getLatestPaidScanByDomain(recentScans, domain);
      return { domain, url: latestPaidScan?.url ?? latestScan?.url ?? `https://${domain}`, latestScan, latestPaidScan, lastTouchedAt: latestPaidScan?.completedAt ?? latestPaidScan?.createdAt ?? latestScan?.completedAt ?? latestScan?.createdAt ?? null, source: paidDomains.includes(domain) ? 'paid' : 'manual' };
    }).sort((a, b) => (b.lastTouchedAt ?? 0) - (a.lastTouchedAt ?? 0));
  }, [hiddenDomains, manualDomains, paidDomains, recentScans, report?.url]);

  // Auto-select first domain when none selected
  useEffect(() => {
    if (!selectedDomain && monitoredSites.length > 0 && !recentLoading) {
      // If there's a report matching initialReportId, select that domain
      if (initialReportId && recentScans.length > 0) {
        const matchedScan = recentScans.find((scan) => scan.id === initialReportId);
        if (matchedScan) {
          setSelectedDomain(getDomain(matchedScan.url));
          return;
        }
      }
      setSelectedDomain(monitoredSites[0].domain);
    }
  }, [selectedDomain, monitoredSites, recentLoading, initialReportId, recentScans]);

  const expandedSite = monitoredSites.find((s) => s.domain === selectedDomain) ?? null;
  const activeWorkspaceReportId = expandedSite?.latestPaidScan?.id ?? expandedSite?.latestScan?.id ?? (initialReportId || '');

  // --- Fetch workspace data (with caching) ---
  useEffect(() => {
    if (!activeWorkspaceReportId) {
      setWorkspaceLoading(false);
      setReport(null);
      setFiles(null);
      return;
    }

    // Check cache first
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
        if (!reportRes.ok) { const p = (await reportRes.json().catch(() => ({}))) as ApiErrorPayload; throw new Error(p.error || 'Failed to load report'); }
        const reportPayload = (await reportRes.json()) as DashboardReportData;
        if (!active) return;
        setReport(reportPayload);
        setReportCache((prev) => ({ ...prev, [activeWorkspaceReportId]: reportPayload }));

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

  const hasPaidAccess = debugPaidPreview || paidOverride || Boolean(report?.hasPaid) || recentScans.some((s) => s.hasPaid);
  const normalizedDomain = normalizeDomainInput(addDomainInput);
  const inputFaviconUrl = useMemo(() => {
    if (!addDomainInput.trim()) return null;
    try { const domain = getDomain(ensureProtocol(addDomainInput)); return domain.includes('.') ? getFaviconUrl(domain, 32) : null; } catch { return null; }
  }, [addDomainInput]);

  // --- Handlers ---
  const selectDomain = useCallback((domain: string) => {
    setSelectedDomain(domain);
  }, []);

  const handleAddDomain = useCallback(async () => {
    setAddError(null);
    if (!normalizedDomain) { setAddError('Please enter a domain'); return; }
    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(normalizedDomain)) { setAddError('Please enter a valid domain (e.g. example.com)'); return; }
    if (monitoredSites.some((s) => s.domain === normalizedDomain) || manualDomains.includes(normalizedDomain)) { setAddError('This domain is already being monitored'); return; }
    if (monitoredSites.length >= 10) { setAddError('Maximum 10 domains allowed'); return; }
    if (!confirmChecked) { setAddError('Please confirm domain ownership'); return; }
    if (!hasPaidAccess) { setPendingDomain(normalizedDomain); setUnlockModalOpen(true); return; }
    const nextManual = [...manualDomains, normalizedDomain]; setManualDomains(nextManual); saveStoredDomains(nextManual);
    const nextHidden = hiddenDomains.filter((d) => d !== normalizedDomain); setHiddenDomains(nextHidden); saveHiddenDomains(nextHidden);
    const matchingPaidScan = getLatestPaidScanByDomain(recentScans, normalizedDomain);
    if (matchingPaidScan) { try { await fetch('/api/monitoring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scanId: matchingPaidScan.id, alertThreshold: 5 }) }); setMonitoringConnected((c) => ({ ...c, [normalizedDomain]: true })); } catch { /* silently fail */ } }
    setSelectedDomain(normalizedDomain); setAddDomainInput(''); setConfirmChecked(false);
  }, [normalizedDomain, monitoredSites, manualDomains, confirmChecked, hasPaidAccess, hiddenDomains, recentScans]);

  const handleRemoveDomain = useCallback((domain: string) => {
    const nextManual = manualDomains.filter((e) => e !== domain);
    const nextHidden = hiddenDomains.includes(domain) ? hiddenDomains : [...hiddenDomains, domain];
    setManualDomains(nextManual); saveStoredDomains(nextManual); setHiddenDomains(nextHidden); saveHiddenDomains(nextHidden);
    if (selectedDomain === domain) setSelectedDomain(null);
  }, [manualDomains, hiddenDomains, selectedDomain]);

  const handleUnlockComplete = useCallback(() => {
    if (!pendingDomain) return;
    setPaidOverride(true); saveStoredBoolean(ADVANCED_PAID_PREVIEW_KEY, true);
    if (!manualDomains.includes(pendingDomain)) { const next = [pendingDomain, ...manualDomains]; setManualDomains(next); saveStoredDomains(next); }
    setSelectedDomain(pendingDomain); setPendingDomain(null); setUnlockModalOpen(false); setAddDomainInput('');
  }, [pendingDomain, manualDomains]);

  const handleRunFirstScan = useCallback(async (site: SiteSummary) => {
    setActionError('');
    try { const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: site.url }) }); const payload = await res.json(); if (!res.ok) throw new Error(payload.error || 'Failed to start scan'); router.push(`/analysis?scan=${payload.id}`); } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to start scan'); }
  }, [router]);

  const handleReaudit = useCallback(async () => {
    if (!files?.url) return;
    setActionError(''); setReauditLoading(true);
    try { const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: files.url, force: true }) }); const payload = await res.json(); if (!res.ok) throw new Error(payload.error || 'Failed to start scan'); router.push(`/analysis?scan=${payload.id}`); } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to start scan'); } finally { setReauditLoading(false); }
  }, [files?.url, router]);

  const handleEnableMonitoring = useCallback(async () => {
    if (!expandedSite?.latestPaidScan?.id) return;
    setMonitoringLoading(true); setActionError('');
    try { const res = await fetch('/api/monitoring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scanId: expandedSite.latestPaidScan.id, alertThreshold: 5 }) }); const payload = await res.json(); if (!res.ok) throw new Error(payload.error || 'Failed to enable monitoring'); setMonitoringConnected((c) => ({ ...c, [expandedSite.domain]: true })); } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to enable monitoring'); } finally { setMonitoringLoading(false); }
  }, [expandedSite]);

  const value = useMemo<DomainContextValue>(() => ({
    monitoredSites,
    selectedDomain,
    selectDomain,
    addDomainInput,
    setAddDomainInput: (v: string) => { setAddDomainInput(v); setAddError(null); },
    handleAddDomain,
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
    unlockModalOpen,
    setUnlockModalOpen,
    handleUnlockComplete,
    pendingDomain,
    paidOverride,
    debugPaidPreview,
    checkoutBanner,
    inputFaviconUrl,
  }), [
    monitoredSites, selectedDomain, selectDomain, addDomainInput, handleAddDomain, handleRemoveDomain,
    addError, confirmChecked, hasPaidAccess, report, files, workspaceLoading, loadError, recentScans,
    recentLoading, expandedSite, actionError, reauditLoading, handleReaudit, handleRunFirstScan,
    monitoringConnected, monitoringLoading, handleEnableMonitoring, unlockModalOpen, handleUnlockComplete,
    pendingDomain, paidOverride, debugPaidPreview, checkoutBanner, inputFaviconUrl,
  ]);

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  );
}
