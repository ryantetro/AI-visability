'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Crown,
  FileText,
  Globe2,
  Heart,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MiniInfoTile } from '@/components/app/dashboard-primitives';
import { FloatingFeedback } from '@/components/ui/floating-feedback';
import { UnlockFeaturesModal } from '@/components/ui/unlock-features-modal';
import { LockedFeatureOverlay } from '@/components/ui/locked-feature-overlay';
import { cn } from '@/lib/utils';
import { useDomainContext } from '@/contexts/domain-context';
import { useAuth } from '@/hooks/use-auth';
import { useBillingStatus } from '@/hooks/use-billing-status';
import { usePlan } from '@/hooks/use-plan';
import { canAccess, NAV_GATES, type PlanTier } from '@/lib/pricing';
import { formatPlatformLabel } from '@/lib/platform-detection';
import { buildLoginHref } from '@/lib/app-paths';

import { CenteredLoading, CenteredWorkspaceState } from '@/app/advanced/panels/shared';
import type { SiteSummary } from '@/app/advanced/lib/types';

/**
 * Shared workspace shell used by all section pages (/dashboard, /report, /brand, etc.).
 * Handles domain loading, empty states, workspace chrome, and gating.
 */
export function WorkspaceShell({
  sectionKey,
  requiredTier,
  children,
}: {
  /** The NAV_GATES key for this section, e.g. 'dashboard', 'report', 'brand' */
  sectionKey: string;
  /** Override the required tier (defaults to NAV_GATES[sectionKey]) */
  requiredTier?: PlanTier;
  /** Section content renderer — receives workspace data */
  children: (ctx: WorkspaceContext) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const { tier, loading: planLoading } = usePlan();
  const billingStatus = useBillingStatus();

  // Client-side auth guard — redirect to login if no authenticated user
  useEffect(() => {
    if (!authLoading && !authUser) {
      const query = searchParams.toString();
      const nextPath = `${pathname}${query ? `?${query}` : ''}`;
      router.push(buildLoginHref(nextPath));
    }
  }, [authLoading, authUser, pathname, router, searchParams]);

  const {
    monitoredSites,
    selectedDomain,
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
    debugPaidPreview,
    checkoutBanner,
    dismissCheckoutBanner,
  } = useDomainContext();

  const minTier = requiredTier ?? (NAV_GATES[sectionKey] as PlanTier) ?? 'free';
  const hasAccess = canAccess(tier, minTier);
  const isFreeUser = !hasPaidAccess;
  const isMonitoring = selectedDomain ? Boolean(monitoringConnected[selectedDomain]) : false;
  const platformLabel = files ? formatPlatformLabel(files.detectedPlatform) : null;

  // Block rendering until auth check completes — prevents flash of content for unauthenticated users
  if (authLoading || planLoading || (!authUser && !authLoading)) {
    return <CenteredLoading label="Loading workspace..." />;
  }

  if (recentLoading) {
    return <CenteredLoading label="Loading workspace..." />;
  }

  // Gating check — show locked overlay if tier is insufficient
  if (!hasAccess) {
    return (
      <div className="text-white">
        <main className="relative mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <LockedFeatureOverlay
            featureName={sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}
            requiredTier={minTier}
            onUpgrade={() => setUnlockModalOpen(true)}
          />
        </main>
        <UnlockFeaturesModal open={unlockModalOpen} onOpenChange={setUnlockModalOpen} onUnlock={handleUnlockComplete} loading={unlockLoading} />
      </div>
    );
  }

  // No domains yet
  if (monitoredSites.length === 0) {
    return (
      <div className="text-white">
        <main className="relative mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <NoDomainState sectionKey={sectionKey} onOpenUnlock={() => setUnlockModalOpen(true)} />
        </main>
        <FloatingFeedback />
        <UnlockFeaturesModal open={unlockModalOpen} onOpenChange={setUnlockModalOpen} onUnlock={handleUnlockComplete} loading={unlockLoading} />
      </div>
    );
  }

  // Domain selected but still loading
  if (!selectedDomain || !expandedSite) {
    return <CenteredLoading label="Loading workspace..." />;
  }

  if (workspaceLoading) {
    return <CenteredWorkspaceState label="Loading this domain workspace..." />;
  }
  if (loadError && !report) {
    const isScanInProgress = loadError === 'Scan not complete';
    if (isScanInProgress) {
      return <ScanInProgressView domain={selectedDomain ?? ''} scanId={expandedSite?.latestScan?.id ?? ''} />;
    }
    return (
      <CenteredWorkspaceState
        label={loadError}
        tone="error"
      />
    );
  }

  // No scan yet — prompt to run first scan
  if (!expandedSite.latestScan) {
    return (
      <div className="text-white">
        <main className="relative mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <FirstScanPrompt
            domain={selectedDomain}
            expandedSite={expandedSite}
            onRunFirstScan={handleRunFirstScan}
            actionError={actionError}
          />
        </main>
        <FloatingFeedback />
      </div>
    );
  }

  if (!report) {
    // If the latest scan is still in progress, show progress view instead of a dead-end message
    const latestStatus = expandedSite?.latestScan?.status;
    if (latestStatus && latestStatus !== 'complete' && latestStatus !== 'failed') {
      return <ScanInProgressView domain={selectedDomain ?? ''} scanId={expandedSite?.latestScan?.id ?? ''} />;
    }
    return <CenteredWorkspaceState label="Loading report..." />;
  }

  const ctx: WorkspaceContext = {
    domain: selectedDomain,
    report,
    files,
    expandedSite,
    recentScans,
    actionError,
    reauditLoading,
    handleReaudit,
    monitoringConnected: isMonitoring,
    monitoringLoading,
    handleEnableMonitoring,
    handleDisableMonitoring,
    platformLabel,
    tier,
    onOpenUnlock: () => setUnlockModalOpen(true),
    reauditing: reauditLoading,
  };

  return (
    <div className="text-white">
      <main className="relative mx-auto max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {checkoutBanner && (
          <div className="mb-4 rounded-2xl border border-[#25c972]/30 bg-[#25c972]/10 px-4 py-3 text-sm text-[#25c972]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="min-w-0">{checkoutBanner}</p>
              </div>
              <button
                type="button"
                onClick={dismissCheckoutBanner}
                aria-label="Dismiss message"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#25c972]/80 transition-colors hover:bg-[#25c972]/12 hover:text-[#9af1be]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {billingStatus.status?.pendingChange && (
          <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-200" />
                  <span>
                    {billingStatus.status.pendingChange.targetLabel} is scheduled for{' '}
                    {billingStatus.status.pendingChange.effectiveAt
                      ? new Date(billingStatus.status.pendingChange.effectiveAt).toLocaleDateString()
                      : 'the next renewal'}.
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-50/80">
                  {billingStatus.status.readiness.viewerIssues.length > 0
                    ? `${billingStatus.status.readiness.viewerIssues.length} cleanup item${billingStatus.status.readiness.viewerIssues.length === 1 ? '' : 's'} still need attention.`
                    : 'No blockers are currently assigned to you.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(billingStatus.status.readiness.viewerIssues.length > 0
                  ? billingStatus.status.readiness.viewerIssues
                  : billingStatus.status.readiness.issues
                ).slice(0, 2).map((issue) => (
                  <Link
                    key={`${issue.category}:${issue.memberUserId ?? 'shared'}:${issue.domain ?? 'global'}`}
                    href={issue.cleanupHref}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-black/35"
                  >
                    {issue.cleanupLabel}
                  </Link>
                ))}
                <Link
                  href="/settings#general"
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-black/35"
                >
                  Billing details
                </Link>
              </div>
            </div>
          </div>
        )}

        {billingStatus.status?.overageMode === 'cleanup_required' && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-300" />
                  <span>Some actions are temporarily in cleanup-only mode.</span>
                </div>
                <p className="mt-1 text-xs text-red-100/75">
                  Additive actions are blocked until the active plan limits are back in range.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {billingStatus.status.overageIssues.slice(0, 2).map((issue) => (
                  <Link
                    key={`${issue.category}:${issue.memberUserId ?? 'shared'}:${issue.domain ?? 'global'}`}
                    href={issue.cleanupHref}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-black/35"
                  >
                    {issue.cleanupLabel}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {actionError && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-300">
            {actionError}
          </div>
        )}

        {children(ctx)}
      </main>
      <FloatingFeedback />
      <UnlockFeaturesModal open={unlockModalOpen} onOpenChange={setUnlockModalOpen} onUnlock={handleUnlockComplete} loading={unlockLoading} />
    </div>
  );
}

export interface WorkspaceContext {
  domain: string;
  report: import('@/app/advanced/lib/types').DashboardReportData;
  files: import('@/app/advanced/lib/types').FilesData | null;
  expandedSite: SiteSummary;
  recentScans: import('@/app/advanced/lib/types').RecentScanData[];
  actionError: string;
  reauditLoading: boolean;
  handleReaudit: () => Promise<void>;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  handleEnableMonitoring: () => Promise<void>;
  handleDisableMonitoring: () => Promise<void>;
  platformLabel: string | null;
  tier: PlanTier;
  onOpenUnlock: () => void;
  reauditing: boolean;
}

// --- Sub-components ---

function NoDomainState({ sectionKey, onOpenUnlock }: { sectionKey: string; onOpenUnlock: () => void }) {
  const searchParams = useSearchParams();
  const {
    addDomainInput,
    setAddDomainInput,
    handleAddDomain,
    addError,
    confirmChecked,
    setConfirmChecked,
    inputFaviconUrl,
  } = useDomainContext();
  const prefilledDomain = searchParams.get('prefillDomain')?.trim() ?? '';
  const resumeLandingFlow = sectionKey === 'dashboard' && searchParams.get('autoStart') === '1' && Boolean(prefilledDomain);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      {/* Welcome header */}
      <h1 className="text-3xl font-bold tracking-tight text-white">Welcome to airadr</h1>
      <p className="mt-2 text-[14px] text-zinc-400">Get your AI visibility score in three simple steps</p>

      {/* 3-step visual flow */}
      <div className="mx-auto mt-8 flex items-center gap-3">
        {[
          { num: '1', label: 'Add domain' },
          { num: '2', label: 'Run scan' },
          { num: '3', label: 'Get score' },
        ].map((step, i) => (
          <div key={step.num} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#356df4]/30 bg-[#356df4]/10 text-[14px] font-bold text-[#356df4]">
                {step.num}
              </div>
              <span className="text-[11px] font-medium text-zinc-400">{step.label}</span>
            </div>
            {i < 2 && <div className="mb-5 h-px w-8 bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Existing add domain section */}
      <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <Plus className="h-6 w-6 text-zinc-300" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Add your first domain</h2>
      <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-6 text-zinc-500">
        {resumeLandingFlow
          ? `We saved ${prefilledDomain} from the landing page. Confirm ownership, then continue the scan.`
          : 'Start monitoring your AI visibility by adding a domain.'}
      </p>

      <div className="mx-auto mt-6 w-full max-w-[420px] space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-white/10 bg-[#1b1b1c] px-3">
            {inputFaviconUrl ? (
              <img src={inputFaviconUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
            ) : (
              <Globe2 className="h-4 w-4 shrink-0 text-zinc-500" />
            )}
            <input
              type="text"
              value={addDomainInput}
              onChange={(e) => setAddDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleAddDomain()}
              placeholder="example.com"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleAddDomain()}
            className="h-11 shrink-0 rounded-lg bg-[var(--color-primary)] px-5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {resumeLandingFlow ? 'Add & run scan' : 'Add'}
          </button>
        </div>
        {addError && <p className="text-[11px] text-red-400">{addError}</p>}
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-zinc-400"
          />
          <span className="text-[12px] leading-5 text-zinc-500">
            I confirm that I own this domain or have authorization to monitor it.
          </span>
        </label>
      </div>

      <div className="mx-auto mt-8 grid w-full max-w-[520px] gap-3 sm:grid-cols-3">
        <MiniInfoTile title="AI Visibility Score" body="See how ChatGPT, Perplexity, and Claude rank your site" />
        <MiniInfoTile title="Mention Tracking" body="Track which prompts trigger mentions of your business" />
        <MiniInfoTile title="Fix Roadmap" body="Get prioritized fixes to improve your visibility" />
      </div>
    </div>
  );
}

const SCAN_STEPS = [
  { label: 'Crawling site', detail: 'Checking robots.txt, llms.txt, sitemap' },
  { label: 'Analyzing pages', detail: 'Scanning content and structure' },
  { label: 'Measuring performance', detail: 'Running PageSpeed analysis' },
  { label: 'Checking structured data', detail: 'Schema.org, Open Graph, JSON-LD' },
  { label: 'Scoring AI visibility', detail: '6 dimension analysis' },
  { label: 'Generating files', detail: 'Building fix recommendations' },
  { label: 'Testing AI mentions', detail: 'Querying ChatGPT, Perplexity, Gemini, Claude' },
  { label: 'Finalizing report', detail: 'Compiling results' },
];

interface ScanProgressData {
  status: string;
  checks?: Array<{ label: string; status: string }>;
  currentStep?: string;
}

function ScanInProgressView({ domain, scanId }: { domain: string; scanId: string }) {
  const [progress, setProgress] = useState<ScanProgressData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [scanStatus, setScanStatus] = useState<'running' | 'complete' | 'failed'>('running');
  const [scanError, setScanError] = useState<string | null>(null);

  // Poll scan status for live progress
  useEffect(() => {
    if (!scanId) return;
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/scan/${scanId}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.progress) {
            setProgress(data.progress);
          }
          if (active && data.status === 'complete') {
            setScanStatus('complete');
          }
          if (active && data.status === 'failed') {
            setScanStatus('failed');
            setScanError(data.progress?.error || 'Scan failed');
          }
        }
      } catch { /* ignore */ }
    }

    void poll();
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [scanId]);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const checks = progress?.checks;
  const completedCount = checks?.filter((c) => c.status === 'done').length ?? 0;
  const totalSteps = checks?.length ?? SCAN_STEPS.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const currentStep = checks?.find((c) => c.status === 'running');
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,13,14,0.98)_0%,rgba(8,8,9,0.99)_100%)] p-8">
          {/* Header */}
          <div className="text-center">
            <div className={cn(
              'mx-auto flex h-16 w-16 items-center justify-center rounded-full border',
              scanStatus === 'complete'
                ? 'border-[#25c972]/30 bg-[#25c972]/10'
                : scanStatus === 'failed'
                  ? 'border-red-500/30 bg-red-500/10'
                : 'border-[#356df4]/30 bg-[#356df4]/10'
            )}>
              {scanStatus === 'complete' ? (
                <CheckCircle2 className="h-7 w-7 text-[#25c972]" />
              ) : scanStatus === 'failed' ? (
                <AlertTriangle className="h-7 w-7 text-red-400" />
              ) : (
                <Loader2 className="h-7 w-7 animate-spin text-[#356df4]" />
              )}
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">
              {scanStatus === 'complete'
                ? 'Scan complete'
                : scanStatus === 'failed'
                  ? 'Scan failed'
                  : `Scanning ${domain}`}
            </h2>
            <p className="mt-2 text-[13px] text-zinc-400">
              {scanStatus === 'complete'
                ? 'Loading your report...'
                : scanStatus === 'failed'
                  ? (scanError || 'We couldn’t finish this scan.')
                : "Analyzing your site\u2019s AI visibility, web health, and mentions."}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-zinc-300">{progressPct}% complete</span>
              <span className="tabular-nums text-zinc-500">
                {mins}:{secs.toString().padStart(2, '0')} elapsed
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#356df4] to-[#25c972] transition-all duration-700 ease-out"
                style={{ width: `${Math.max(progressPct, 3)}%` }}
              />
            </div>
          </div>

          {/* Step list */}
          <div className="mt-6 space-y-2">
            {(checks ?? SCAN_STEPS.map((s) => ({ label: s.label, status: 'pending' }))).map((step, i) => {
              const isDone = step.status === 'done';
              const isRunning = step.status === 'running';
              const isError = step.status === 'error';
              const detail = SCAN_STEPS[i]?.detail;

              return (
                <div
                  key={step.label}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                    isRunning && 'bg-[#356df4]/8',
                  )}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-[#25c972]" />
                    ) : isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#356df4]" />
                    ) : isError ? (
                      <Circle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'text-[13px] font-medium',
                      isDone ? 'text-zinc-400' : isRunning ? 'text-white' : 'text-zinc-500'
                    )}>
                      {step.label}
                    </p>
                    {isRunning && detail && (
                      <p className="mt-0.5 text-[11px] text-zinc-500">{detail}</p>
                    )}
                  </div>
                  {isDone && (
                    <span className="text-[11px] text-zinc-600">Done</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current step highlight */}
          {currentStep && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#356df4]/20 bg-[#356df4]/5 px-4 py-3">
              <Sparkles className="h-4 w-4 shrink-0 text-[#356df4]" />
              <p className="text-[12px] text-zinc-300">
                Currently: <span className="font-medium text-white">{currentStep.label}</span>
              </p>
            </div>
          )}

          <p className="mt-5 text-center text-[11px] text-zinc-600">
            This usually takes 4–5 minutes. The page will update automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

function FirstScanPrompt({
  domain,
  expandedSite,
  onRunFirstScan,
  actionError,
}: {
  domain: string;
  expandedSite: SiteSummary;
  onRunFirstScan: (site: SiteSummary) => void;
  actionError?: string;
}) {
  return (
    <div className="mt-6 rounded-[1.2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(12,13,14,0.98)_0%,rgba(8,8,9,0.99)_100%)] p-5">
      {actionError && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5 text-xs text-red-300">
          {actionError}
        </div>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#25c972]">Domain added</p>
      <h3 className="mt-2 text-xl font-semibold text-white">Run the first scan for {domain}</h3>
      <p className="mt-3 max-w-2xl text-[13px] leading-6 text-zinc-400">
        Generate a report to see your AI visibility score and fixes.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onRunFirstScan(expandedSite)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />Run first scan
        </button>
        <a
          href={expandedSite.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]"
        >
          Visit site<ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
