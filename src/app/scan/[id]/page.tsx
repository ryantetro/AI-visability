'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  Linkedin,
  ListChecks,
  RefreshCw,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Twitter,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDomain, getFaviconUrl } from '@/lib/url-utils';
import { useScanProgress } from '@/hooks/use-scan-progress';
import { ProgressChecklist } from '@/components/ui/progress-checklist';
import { ScoreRing } from '@/components/ui/score-ring';
import { EmailGate } from '@/components/ui/email-gate';

interface ReportData {
  id: string;
  url: string;
  score: {
    total: number;
    maxTotal: number;
    percentage: number;
    band: string;
    bandInfo: { band: string; label: string; color: string };
    dimensions: {
      key: string;
      label: string;
      score: number;
      maxScore: number;
      percentage: number;
      checks: {
        id: string;
        label: string;
        verdict: 'pass' | 'fail' | 'unknown';
        points: number;
        maxPoints: number;
        detail: string;
      }[];
    }[];
    fixes: {
      checkId: string;
      label: string;
      instruction: string;
      pointsAvailable: number;
      effort: number;
      roi: number;
    }[];
  };
  hasPaid: boolean;
}

function effortLabel(effort: number) {
  const labels = ['Trivial', 'Easy', 'Moderate', 'Involved', 'Complex'];
  return labels[Math.max(0, Math.min(4, Math.round(effort) - 1))] ?? 'Moderate';
}

function statusTheme(status: 'running' | 'complete' | 'failed' | 'queued') {
  if (status === 'failed') return { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' };
  if (status === 'complete') return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' };
  if (status === 'running') return { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400 animate-pulse' };
  return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' };
}

function formatDate(timestamp?: number) {
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ScanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error } = useScanProgress(id);

  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [reauditLoading, setReauditLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      setShareUrl(`${window.location.origin}/score/${id}`);
    }
  }, [id]);

  type TabId = 'overview' | 'repair-queue' | 'dimensions' | 'share';
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === 'undefined') return 'overview';
    const hash = window.location.hash.slice(1);
    return (hash === 'repair-queue' || hash === 'dimensions' || hash === 'share' || hash === 'overview')
      ? hash
      : 'overview';
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'repair-queue' || hash === 'dimensions' || hash === 'share' || hash === 'overview') {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setTab = (tab: TabId) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tab}`);
    }
  };

  const isScanning =
    data?.status === 'crawling' ||
    data?.status === 'scoring' ||
    data?.status === 'pending';
  const isComplete = data?.status === 'complete';
  const isFailed = data?.status === 'failed';

  const statusKey: 'running' | 'complete' | 'failed' | 'queued' = isScanning
    ? 'running'
    : isComplete
      ? 'complete'
      : isFailed
        ? 'failed'
        : 'queued';

  const statusLabel =
    statusKey === 'running'
      ? 'Analyzing'
      : statusKey === 'complete'
        ? 'Complete'
        : statusKey === 'failed'
          ? 'Failed'
          : 'Queued';

  const statusStyles = statusTheme(statusKey);

  const progressChecks = (data?.progress?.checks ?? []) as {
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
  }[];

  const totalChecks = progressChecks.length;
  const doneChecks = progressChecks.filter((item) => item.status === 'done').length;
  const runningChecks = progressChecks.filter((item) => item.status === 'running').length;
  const errorChecks = progressChecks.filter((item) => item.status === 'error').length;

  const progressPercent =
    totalChecks > 0
      ? Math.round(((doneChecks + runningChecks * 0.5) / totalChecks) * 100)
      : 0;

  const currentStep =
    data?.progress?.currentStep ??
    progressChecks.find((item) => item.status === 'running')?.label ??
    (progressChecks.length > 0 ? progressChecks[progressChecks.length - 1]?.label : 'Initializing');

  const reportDimensions = report?.score.dimensions ?? [];
  const reportFixes = report?.score.fixes ?? [];

  const allChecks = reportDimensions.flatMap((dimension) => dimension.checks);
  const failedCount = allChecks.filter((item) => item.verdict === 'fail').length;
  const passedCount = allChecks.filter((item) => item.verdict === 'pass').length;
  const unknownCount = allChecks.filter((item) => item.verdict === 'unknown').length;

  const topFixes = reportFixes.slice(0, 3);
  const totalLift = topFixes.reduce((sum, fix) => sum + fix.pointsAvailable, 0);

  const weakestDimension =
    reportDimensions.length > 0
      ? reportDimensions.reduce((worst, current) =>
          current.percentage < worst.percentage ? current : worst
        )
      : null;

  const domain = data?.url ? getDomain(data.url) : 'Unknown domain';

  const handleEmailSubmit = async (email: string) => {
    void email;
    setActionError('');
    setEmailSubmitted(true);
    setLoadingReport(true);

    try {
      const res = await fetch(`/api/scan/${id}/report`);
      if (res.ok) {
        const payload = await res.json();
        setReport(payload);
      }
    } catch {
      // User can refresh and retry.
    } finally {
      setLoadingReport(false);
    }
  };

  const handleReaudit = async () => {
    if (!data?.url) return;

    setActionError('');
    setReauditLoading(true);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url, force: true }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to start a fresh scan');
      }

      router.push(`/scan/${payload.id}`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to start a fresh scan'
      );
    } finally {
      setReauditLoading(false);
    }
  };

  const handleCheckout = async () => {
    setActionError('');
    setCheckoutLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: id }),
      });

      if (!res.ok) {
        throw new Error('Failed to start checkout');
      }

      const session = await res.json();
      router.push(session.url);
    } catch {
      setActionError('Unable to start checkout right now. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-page)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]" />
          <p className="text-sm text-[var(--text-tertiary)]">Loading audit...</p>
        </div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-page)] px-4">
        <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-zinc-50/80 p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <TriangleAlert className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Unable to load audit</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-700)]"
          >
            Start new scan
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-[var(--surface-page)]', report && !report.hasPaid && 'pb-24')}>
      {/* Subtle gradient mesh background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[var(--color-primary-500)]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[var(--color-accent-500)]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ─── Top Nav ───────────────────────────────────────────── */}
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Home
            </Link>
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-[var(--text-secondary)]">Audit</span>
            {report && (
              <>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="truncate max-w-[140px] font-medium text-[var(--text-primary)] sm:max-w-none">
                  {getDomain((report ?? data)?.url ?? '')}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/50 hover:text-[var(--text-primary)] dark:hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
              New scan
            </Link>
            {data?.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/50 hover:text-[var(--text-primary)] dark:hover:bg-white/5"
              >
                Visit site
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
            {data?.url && (
              <button
                type="button"
                onClick={handleReaudit}
                disabled={reauditLoading}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/50 hover:text-[var(--text-primary)] disabled:opacity-50 dark:hover:bg-white/5"
              >
                <RefreshCw className={cn('h-4 w-4', reauditLoading && 'animate-spin')} />
                {reauditLoading ? 'Re-auditing...' : 'Re-audit'}
              </button>
            )}
          </div>
        </nav>

        {/* ─── Header ───────────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
                statusStyles.bg,
                statusStyles.text
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', statusStyles.dot)} />
              {statusLabel}
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              {domain}
            </span>
            {data?.createdAt && (
              <span className="text-sm text-[var(--text-muted)]">
                {formatDate(data.createdAt)}
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {isScanning
              ? 'Building your AI visibility map'
              : isComplete
                ? 'Your report is ready'
                : isFailed
                  ? 'Audit stopped'
                  : 'Preparing audit'}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-[var(--text-secondary)]">
            {isScanning
              ? 'Analyzing crawl, structure, and entity signals in real time.'
              : isComplete
                ? 'See your score and prioritized fixes to improve AI discoverability.'
                : isFailed
                  ? 'Something went wrong before we could finish.'
                  : 'Your audit will start shortly.'}
          </p>
        </header>

        {actionError && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {actionError}
          </div>
        )}

        {/* ─── Scanning State ─────────────────────────────────────── */}
        {isScanning && data?.progress && (
          <section className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="border-b border-zinc-200 px-6 py-5 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-[var(--text-primary)]">Live pipeline</h2>
                  <span className="rounded-full bg-[var(--color-primary-100)] px-3 py-1 text-sm font-semibold text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)] dark:text-[var(--color-primary-300)]">
                    {progressPercent}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-900)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary-600)] transition-[width] duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">{currentStep}</p>
              </div>
              <div className="p-6">
                <ProgressChecklist checks={progressChecks} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 px-6 py-4 dark:border-white/10">
                <div className="flex gap-6 text-sm">
                  <span className="text-[var(--text-tertiary)]">
                    Done <strong className="text-[var(--color-primary-600)]">{doneChecks}</strong>
                  </span>
                  <span className="text-[var(--text-tertiary)]">
                    Running <strong className="text-amber-600 dark:text-amber-400">{runningChecks}</strong>
                  </span>
                  {errorChecks > 0 && (
                    <span className="text-[var(--text-tertiary)]">
                      Errors <strong className="text-red-600 dark:text-red-400">{errorChecks}</strong>
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  Next: score profile, fix queue, and dimension breakdown
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ─── Failed State ─────────────────────────────────────── */}
        {isFailed && (
          <section>
            <div className="flex gap-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <TriangleAlert className="h-5 w-5 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Audit halted</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {data?.progress?.error || 'An error occurred while scanning the site.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleReaudit}
                    disabled={reauditLoading}
                    className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-50"
                  >
                    {reauditLoading ? 'Restarting...' : 'Run scan again'}
                  </button>
                  <Link
                    href="/"
                    className="rounded-lg border border-zinc-200 bg-white/50 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Back home
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Score Reveal (pre-email) ─────────────────────────── */}
        {isComplete && data?.score !== undefined && !emailSubmitted && (
          <section className="grid gap-8 lg:grid-cols-[1fr,380px]">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/80 p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
                <div className="flex justify-center sm:justify-start">
                  <ScoreRing
                    score={data.score}
                    color={data.bandInfo?.color || 'var(--color-primary-600)'}
                    size={160}
                  />
                </div>
                <div className="flex-1">
                  <span
                    className="inline-block rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{
                      backgroundColor: `${data.bandInfo?.color}20`,
                      color: data.bandInfo?.color,
                    }}
                  >
                    {data.bandInfo?.label}
                  </span>
                  <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
                    Unlock your full repair blueprint
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    Reveal the exact fixes that move your score fastest, with impact and effort context.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <div className="rounded-lg border border-zinc-200 bg-white/60 px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Dimensions</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">6 scored areas</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white/60 px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Fix queue</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">ROI-prioritized</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <EmailGate scanId={id} onSubmit={handleEmailSubmit} className="max-w-none" />
          </section>
        )}

        {/* ─── Loading Report ────────────────────────────────────── */}
        {emailSubmitted && !report && loadingReport && (
          <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50/80 py-16 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]" />
              <p className="text-sm text-[var(--text-secondary)]">Loading your intelligence report...</p>
            </div>
          </div>
        )}

        {emailSubmitted && !report && !loadingReport && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            We couldn&apos;t load your report yet. Please refresh and retry.
          </div>
        )}

        {/* ─── Full Report ────────────────────────────────────────── */}
        {report && (
          <div>
            {/* Score — always visible */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <ScoreRing
                    score={report.score.percentage}
                    color={report.score.bandInfo.color}
                    size={100}
                  />
                  <div>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
                      style={{
                        backgroundColor: `${report.score.bandInfo.color}25`,
                        color: report.score.bandInfo.color,
                      }}
                    >
                      {report.score.bandInfo.label}
                    </span>
                    <p className="mt-1 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <img
                        src={getFaviconUrl(getDomain(report.url))}
                        alt=""
                        className="h-4 w-4 rounded"
                      />
                      {getDomain(report.url)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {report.hasPaid && (
                    <Link
                      href={`/dashboard/${report.id}`}
                      className="flex items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-700)]"
                    >
                      Open dashboard
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                  <Link href="/" className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <Target className="h-4 w-4 text-[var(--color-primary-600)]" />
                    AISO
                  </Link>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <TabButton active={activeTab === 'overview'} onClick={() => setTab('overview')} icon={LayoutDashboard}>
                Overview
              </TabButton>
              <TabButton active={activeTab === 'repair-queue'} onClick={() => setTab('repair-queue')} icon={ListChecks}>
                Repair Queue
              </TabButton>
              <TabButton active={activeTab === 'dimensions'} onClick={() => setTab('dimensions')} icon={BarChart3}>
                Dimensions
              </TabButton>
              <TabButton active={activeTab === 'share'} onClick={() => setTab('share')} icon={Share2}>
                Share
              </TabButton>
            </div>

            {/* Tab content — only active tab shown */}
            {activeTab === 'overview' && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Domain" value={getDomain(report.url)} domain={getDomain(report.url)} />
                <StatCard label="Failed" value={String(failedCount)} variant="error" />
                <StatCard label="Unknown" value={String(unknownCount)} />
                <StatCard label="Passed" value={String(passedCount)} variant="success" />
                <StatCard
                  label="Potential lift"
                  value={`+${totalLift} pts`}
                  sublabel={weakestDimension ? `Focus: ${weakestDimension.label}` : undefined}
                  variant="success"
                  className="sm:col-span-2"
                />
              </div>
            )}

            {activeTab === 'repair-queue' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  Prioritized by impact. Fix these first to improve your AI visibility score.
                </p>
                {reportFixes.length > 0 ? (
                  reportFixes.slice(0, 10).map((fix, index) => (
                    <FixCard
                      key={fix.checkId}
                      index={index + 1}
                      label={fix.label}
                      instruction={fix.instruction}
                      effort={fix.effort}
                      pointsAvailable={fix.pointsAvailable}
                      roi={fix.roi}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                      <Sparkles className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="font-medium text-[var(--text-primary)]">No blocking issues detected</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Your site is in good shape. Keep monitoring for changes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dimensions' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Dimension breakdown</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Six scored areas that determine AI visibility. Expand each to see individual checks.
                  </p>
                </div>
                <div className="space-y-4">
                  {reportDimensions.map((dimension) => {
                    const failed = dimension.checks.filter((c) => c.verdict === 'fail').length;
                    const passed = dimension.checks.filter((c) => c.verdict === 'pass').length;
                    const unknown = dimension.checks.filter((c) => c.verdict === 'unknown').length;

                    return (
                      <DimensionCard
                        key={dimension.key}
                        dimension={dimension}
                        passed={passed}
                        failed={failed}
                        unknown={unknown}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'share' && (
              <div className="mx-auto max-w-2xl space-y-8">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Share your report</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Share this link with your team or stakeholders to let them view the score.
                  </p>
                </div>

                {/* Share link card */}
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="border-b border-zinc-200 px-5 py-4 dark:border-white/10">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Share link</p>
                  </div>
                  <div className="flex gap-0 p-4">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 rounded-l-lg border border-r-0 border-zinc-200 bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary-600)] dark:border-white/10 dark:bg-white/5"
                    />
                    <button
                      type="button"
                      disabled={!shareUrl}
                      onClick={async () => {
                        if (shareUrl) {
                          await navigator.clipboard.writeText(shareUrl);
                          setShareLinkCopied(true);
                          setTimeout(() => setShareLinkCopied(false), 2000);
                        }
                      }}
                      className={cn(
                        'flex items-center gap-2 rounded-r-lg border px-4 py-3 text-sm font-medium transition-colors',
                        shareLinkCopied
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-zinc-200 bg-white text-[var(--text-primary)] hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                      )}
                    >
                      {shareLinkCopied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        'Copy link'
                      )}
                    </button>
                  </div>
                </div>

                {/* Social share */}
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="border-b border-zinc-200 px-5 py-4 dark:border-white/10">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Share to social</p>
                  </div>
                  <div className="flex gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/score/${id}`;
                        const text = `${getDomain(report.url)} scored ${report.score.percentage}/100 on AISO (${report.score.bandInfo.label}).`;
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=720,height=640');
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <Twitter className="h-4 w-4" />
                      Share on X
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/score/${id}`;
                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=720,height=640');
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <Linkedin className="h-4 w-4" />
                      Share on LinkedIn
                    </button>
                  </div>
                </div>

                {/* Dashboard / CTA card */}
                {!report.hasPaid ? (
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-start gap-4 p-6">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-500)]/10">
                        <TrendingUp className="h-5 w-5 text-[var(--color-primary-600)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">Done-for-you fixes</h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Deploy-ready: llms.txt, robots.txt, schema, sitemap. Ship all fixes in one package.
                        </p>
                        <button
                          onClick={handleCheckout}
                          disabled={checkoutLoading}
                          className="mt-4 rounded-lg bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-50"
                        >
                          {checkoutLoading ? 'Loading...' : 'Get package — $99'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between gap-4 p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--text-primary)]">Full access unlocked</h3>
                          <p className="text-sm text-[var(--text-secondary)]">View and deploy your fixes</p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/${report.id}`}
                        className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-700)]"
                      >
                        Open dashboard
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky CTA bar */}
      {report && !report.hasPaid && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-zinc-50/95 py-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="text-sm text-[var(--text-secondary)]">
              Ready to ship fixes for <span className="font-semibold text-[var(--text-primary)]">{getDomain(report.url)}</span>?
            </p>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="rounded-lg bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-50"
            >
              {checkoutLoading ? 'Loading...' : 'Fix Everything — $99'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-initial',
        active
          ? 'bg-white text-[var(--text-primary)] shadow-sm dark:bg-white/10'
          : 'text-[var(--text-secondary)] hover:bg-white/50 hover:text-[var(--text-primary)] dark:hover:bg-white/5'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function DimensionCard({
  dimension,
  passed,
  failed,
  unknown,
}: {
  dimension: { key: string; label: string; score: number; maxScore: number; percentage: number; checks: { id: string; label: string; verdict: 'pass' | 'fail' | 'unknown'; points: number; maxPoints: number; detail: string }[] };
  passed: number;
  failed: number;
  unknown: number;
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(dimension.percentage);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-white/50 dark:hover:bg-white/5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/60 dark:bg-white/5">
          <BarChart3 className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--text-primary)]">{dimension.label}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
            <span className="tabular-nums text-[var(--text-muted)]">
              {dimension.score}/{dimension.maxScore} points
            </span>
            {passed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {passed} pass
              </span>
            )}
            {failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 font-medium text-red-600 dark:text-red-400">
                <XCircle className="h-3.5 w-3.5" />
                {failed} fail
              </span>
            )}
            {unknown > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                <HelpCircle className="h-3.5 w-3.5" />
                {unknown} unknown
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden w-24 sm:block">
            <div className="h-2 overflow-hidden rounded-full bg-white/60 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--color-primary-600)] transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs tabular-nums text-[var(--text-muted)]">{pct}%</p>
          </div>
          <ChevronDown
            className={cn('h-5 w-5 text-[var(--text-muted)] transition-transform', open && 'rotate-180')}
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-zinc-200 bg-white/30 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="divide-y divide-zinc-200 dark:divide-white/10">
            {dimension.checks.map((check) => (
              <div
                key={check.id}
                className="flex gap-4 px-5 py-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center pt-0.5">
                  {check.verdict === 'pass' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : check.verdict === 'fail' ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <HelpCircle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text-primary)]">{check.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{check.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="rounded-md bg-white/60 px-2 py-1 text-xs font-medium tabular-nums text-[var(--text-muted)] dark:bg-white/5">
                    {check.points}/{check.maxPoints}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  variant,
  domain,
  className,
}: {
  label: string;
  value: string;
  sublabel?: string;
  variant?: 'success' | 'error' | 'default';
  domain?: string;
  className?: string;
}) {
  const valueColor =
    variant === 'success'
      ? 'text-[var(--color-primary-600)]'
      : variant === 'error'
        ? 'text-red-600 dark:text-red-400'
        : 'text-[var(--text-primary)]';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]',
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className={cn('mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums tracking-tight', valueColor)}>
        {domain && (
          <img
            src={getFaviconUrl(domain)}
            alt=""
            className="h-6 w-6 shrink-0 rounded"
          />
        )}
        <span className="truncate">{value}</span>
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{sublabel}</p>}
    </div>
  );
}

function FixCard({
  index,
  label,
  instruction,
  effort,
  pointsAvailable,
  roi,
}: {
  index: number;
  label: string;
  instruction: string;
  effort: number;
  pointsAvailable: number;
  roi: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 shadow-sm transition-colors hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20">
      <div className="flex gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/60 text-sm font-semibold tabular-nums text-[var(--text-muted)] dark:bg-white/5">
          {index}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--text-primary)]">{label}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{instruction}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-md bg-[var(--color-primary-100)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)] dark:text-[var(--color-primary-300)]">
              +{pointsAvailable} pts
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Effort: {effortLabel(effort)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              ROI: {roi.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
