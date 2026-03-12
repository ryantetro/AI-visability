'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDomain } from '@/lib/url-utils';
import { useScanProgress } from '@/hooks/use-scan-progress';
import { ProgressChecklist } from '@/components/ui/progress-checklist';
import { ScoreRing } from '@/components/ui/score-ring';
import { ScoreBandBadge } from '@/components/ui/score-band-badge';
import { EmailGate } from '@/components/ui/email-gate';
import { ShareButtons } from '@/components/ui/share-buttons';

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

function effortVisual(effort: number) {
  return `${'●'.repeat(Math.max(0, Math.min(5, effort)))}${'○'.repeat(Math.max(0, 5 - effort))}`;
}

function statusTheme(status: 'running' | 'complete' | 'failed' | 'queued') {
  if (status === 'failed') {
    return {
      chip: 'border-red-300 bg-red-50 text-red-700',
      dot: 'bg-red-500',
    };
  }

  if (status === 'complete') {
    return {
      chip: 'border-emerald-300 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    };
  }

  if (status === 'running') {
    return {
      chip: 'border-cyan-300 bg-cyan-50 text-cyan-700',
      dot: 'bg-cyan-500 animate-pulse',
    };
  }

  return {
    chip: 'border-stone-300 bg-stone-50 text-stone-700',
    dot: 'bg-stone-500',
  };
}

function verdictTone(verdict: 'pass' | 'fail' | 'unknown') {
  if (verdict === 'pass') {
    return {
      icon: '✓',
      shell: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'text-emerald-800',
    };
  }

  if (verdict === 'fail') {
    return {
      icon: '✗',
      shell: 'border-red-200 bg-red-50 text-red-700',
      label: 'text-red-800',
    };
  }

  return {
    icon: '?',
    shell: 'border-stone-200 bg-stone-50 text-stone-600',
    label: 'text-stone-700',
  };
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
      ? 'Audit Running'
      : statusKey === 'complete'
        ? 'Audit Complete'
        : statusKey === 'failed'
          ? 'Audit Failed'
          : 'Audit Queued';

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
    (progressChecks.length > 0 ? progressChecks[progressChecks.length - 1]?.label : 'Initializing checks');

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
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f0fdf9_0%,#ffffff_45%,#f8fafc_100%)]">
        <div className="aiso-spinner h-10 w-10 animate-spin rounded-full" />
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="page-light min-h-screen bg-[linear-gradient(145deg,#f8fafc_0%,#ffffff_50%,#f0fdfa_100%)] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-red-200 bg-white/92 p-8 text-center shadow-[0_24px_70px_rgba(127,29,29,0.08)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700">Scan Error</p>
          <h1 className="mt-3 text-2xl font-semibold text-red-900">Unable to load this audit</h1>
          <p className="mt-3 text-sm text-stone-700">{error}</p>
          <Link href="/" className="aiso-button aiso-button-primary mt-6 px-5 py-2.5 text-xs">
            Start new scan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('page-light relative min-h-screen overflow-x-hidden bg-[linear-gradient(155deg,#effcf8_0%,#ffffff_48%,#eef7ff_100%)]', report && !report.hasPaid && 'pb-24')}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.24)_0%,transparent_68%)] blur-2xl" />
        <div className="absolute top-24 right-[-80px] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.2)_0%,transparent_70%)] blur-2xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1180px] px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <header className="rounded-[30px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(255,255,255,0.78))] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.17em]', statusStyles.chip)}>
                  <span className={cn('h-2 w-2 rounded-full', statusStyles.dot)} />
                  {statusLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-stone-200 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-600">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  AI Visibility Audit
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950 sm:text-[2rem]">
                {isScanning
                  ? 'Signal map is building in real time.'
                  : isComplete
                    ? 'Your visibility intelligence report is live.'
                    : isFailed
                      ? 'The audit session stopped before completion.'
                      : 'Preparing audit session.'}
              </h1>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <InfoPill label="Domain" value={domain} />
                <InfoPill label="Started" value={formatDate(data?.createdAt)} />
                <InfoPill
                  label={isScanning ? 'ETA' : 'Status'}
                  value={isScanning && typeof data?.estimatedRemainingSec === 'number' ? `~${data.estimatedRemainingSec}s` : statusLabel}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="aiso-button aiso-button-secondary px-3.5 py-2 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                New scan
              </Link>

              {data?.url && (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="aiso-button aiso-button-secondary px-3.5 py-2 text-xs"
                >
                  Visit site
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}

              {data?.url && (
                <button
                  type="button"
                  onClick={handleReaudit}
                  disabled={reauditLoading}
                  className="aiso-button aiso-button-secondary px-3.5 py-2 text-xs"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', reauditLoading && 'animate-spin')} />
                  {reauditLoading ? 'Re-auditing...' : 'Re-audit'}
                </button>
              )}
            </div>
          </div>
        </header>

        {actionError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-2.5 text-xs font-medium text-red-700">
            {actionError}
          </div>
        )}

        {isScanning && data?.progress && (
          <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr),300px]">
            <article className="rounded-[26px] border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(255,255,255,0.84))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">Live pipeline</p>
                  <h2 className="mt-1 text-lg font-semibold text-stone-950">Analyzing crawl, structure, and entity signals</h2>
                </div>
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                  {progressPercent}%
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-cyan-100/70">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4,#0891b2,#0ea5e9)] transition-[width] duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                />
              </div>

              <div className="mt-4 rounded-xl border border-stone-200 bg-white px-3 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Current step</p>
                <p className="text-sm font-medium text-stone-900">{currentStep}</p>
              </div>

              <div className="mt-4 rounded-2xl border border-stone-200 bg-white px-3 py-3">
                <ProgressChecklist checks={progressChecks} />
              </div>
            </article>

            <aside className="space-y-3">
              <MetricStack title="Check status" rows={[
                { label: 'Done', value: String(doneChecks), tone: 'text-emerald-700' },
                { label: 'Running', value: String(runningChecks), tone: 'text-cyan-700' },
                { label: 'Errors', value: String(errorChecks), tone: 'text-red-700' },
              ]} />

              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/75 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">What you get next</p>
                <p className="mt-2 text-sm leading-6 text-emerald-900">
                  A score profile, prioritized fix queue, and full dimension-by-dimension breakdown.
                </p>
              </div>
            </aside>
          </section>
        )}

        {isFailed && (
          <section className="mt-5">
            <div className="rounded-[26px] border border-red-200 bg-[linear-gradient(170deg,rgba(254,242,242,0.95),rgba(255,255,255,0.9))] p-5 shadow-[0_24px_70px_rgba(127,29,29,0.1)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-red-100 p-2 text-red-700">
                  <TriangleAlert className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700">Audit halted</p>
                  <h2 className="mt-1 text-lg font-semibold text-red-900">We hit a blocker before scoring finished</h2>
                  <p className="mt-2 text-sm text-red-900/90">
                    {data?.progress?.error || 'An error occurred while scanning the site.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleReaudit}
                      disabled={reauditLoading}
                      className="aiso-button aiso-button-primary px-4 py-2 text-xs"
                    >
                      {reauditLoading ? 'Restarting...' : 'Run scan again'}
                    </button>
                    <Link href="/" className="aiso-button aiso-button-secondary px-4 py-2 text-xs">
                      Back home
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {isComplete && data?.score !== undefined && !emailSubmitted && (
          <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr),360px]">
            <article className="rounded-[26px] border border-white/70 bg-[linear-gradient(170deg,rgba(255,255,255,0.95),rgba(255,255,255,0.84))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Score reveal</p>
              <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex justify-center sm:justify-start">
                  <ScoreRing
                    score={data.score}
                    color={data.bandInfo?.color || 'var(--color-primary-600)'}
                    size={170}
                  />
                </div>
                <div className="flex-1">
                  {data.bandInfo && (
                    <ScoreBandBadge label={data.bandInfo.label} color={data.bandInfo.color} />
                  )}
                  <h2 className="mt-3 text-xl font-semibold text-stone-950">Unlock your full repair blueprint</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Reveal the exact fixes that move your score fastest, with impact and effort context.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <InfoPill label="Dimensions" value="6 scored areas" />
                    <InfoPill label="Fix queue" value="ROI-prioritized" />
                  </div>
                </div>
              </div>
            </article>

            <EmailGate scanId={id} onSubmit={handleEmailSubmit} className="max-w-none" />
          </section>
        )}

        {emailSubmitted && !report && loadingReport && (
          <div className="mt-5 flex items-center justify-center rounded-2xl border border-stone-200 bg-white/90 px-4 py-10">
            <div className="flex items-center gap-3 text-sm text-stone-700">
              <div className="aiso-spinner h-5 w-5 animate-spin rounded-full" />
              Loading your intelligence report...
            </div>
          </div>
        )}

        {emailSubmitted && !report && !loadingReport && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700">
            We couldn&apos;t load your report yet. Please refresh and retry.
          </div>
        )}

        {report && (
          <>
            <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr),320px]">
              <article className="rounded-[26px] border border-white/70 bg-[linear-gradient(170deg,rgba(255,255,255,0.95),rgba(255,255,255,0.84))] p-5 shadow-[0_26px_80px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <ScoreRing
                      score={report.score.percentage}
                      color={report.score.bandInfo.color}
                      size={150}
                    />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Overall signal</p>
                      <h2 className="mt-1 text-xl font-semibold text-stone-950">{report.score.total}/{report.score.maxTotal}</h2>
                      <div className="mt-2">
                        <ScoreBandBadge label={report.score.bandInfo.label} color={report.score.bandInfo.color} compact />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 lg:max-w-[360px]">
                    <InfoPill label="Fail" value={String(failedCount)} tone="text-red-700" />
                    <InfoPill label="Unknown" value={String(unknownCount)} tone="text-stone-700" />
                    <InfoPill label="Pass" value={String(passedCount)} tone="text-emerald-700" />
                  </div>
                </div>

                <div className="mt-4 border-t border-stone-200 pt-4">
                  <ShareButtons
                    scanId={id}
                    score={report.score.percentage}
                    bandLabel={report.score.bandInfo.label}
                    domain={getDomain(report.url)}
                  />
                </div>
              </article>

              <aside className="space-y-3">
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Priority lift</p>
                  <p className="mt-1 text-xl font-semibold text-cyan-900">+{totalLift} pts</p>
                  <p className="mt-2 text-xs leading-5 text-cyan-900/80">
                    Estimated gain from the top three fixes in your queue.
                  </p>
                </div>

                {weakestDimension && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/75 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Biggest gap</p>
                    <p className="mt-1 text-sm font-semibold text-amber-900">{weakestDimension.label}</p>
                    <p className="mt-1 text-xs text-amber-900/80">{weakestDimension.percentage}% complete</p>
                  </div>
                )}
              </aside>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr),340px]">
              <article className="rounded-[26px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-stone-950">Priority Repair Queue</h3>
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700">
                    Top {Math.min(reportFixes.length, 10)}
                  </span>
                </div>

                {reportFixes.length > 0 ? (
                  <div className="space-y-2">
                    {reportFixes.slice(0, 10).map((fix, index) => (
                      <div key={fix.checkId} className="rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-[11px] font-semibold text-stone-700">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-stone-900">{fix.label}</p>
                              <p className="mt-1 text-xs leading-5 text-stone-600">{fix.instruction}</p>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                              +{fix.pointsAvailable} pts
                            </span>
                            <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 font-medium text-stone-700">
                              Effort {effortVisual(fix.effort)}
                            </span>
                            <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 font-medium text-stone-700">
                              ROI {fix.roi.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    No blocking issues detected in the current report.
                  </div>
                )}
              </article>

              <aside className="space-y-3">
                {!report.hasPaid ? (
                  <div className="rounded-2xl border border-stone-900 bg-stone-900 p-4 text-white shadow-[0_22px_50px_rgba(15,23,42,0.2)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Done-for-you package</p>
                    <h4 className="mt-2 text-base font-semibold">Generate deploy-ready fixes instantly</h4>
                    <p className="mt-2 text-xs leading-5 text-stone-300">
                      Includes llms.txt, robots.txt updates, organization schema, and sitemap package.
                    </p>
                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      className="aiso-button aiso-button-primary mt-3 w-full px-4 py-2.5 text-xs"
                    >
                      {checkoutLoading ? 'Loading...' : 'Fix Everything — $99'}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Package unlocked</p>
                    <p className="mt-2 text-xs leading-5 text-emerald-900">
                      Your generated files are ready in the implementation dashboard.
                    </p>
                    <Link href={`/dashboard/${report.id}`} className="aiso-button aiso-button-secondary mt-3 w-full px-4 py-2.5 text-xs">
                      Open dashboard
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </aside>
            </section>

            <section className="mt-5 space-y-2">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-stone-500" />
                <h3 className="text-base font-semibold text-stone-900">Dimension Deep Dive</h3>
              </div>

              {reportDimensions.map((dimension) => {
                const failed = dimension.checks.filter((item) => item.verdict === 'fail').length;
                const passed = dimension.checks.filter((item) => item.verdict === 'pass').length;
                const unknown = dimension.checks.filter((item) => item.verdict === 'unknown').length;
                const isPrimaryGap = weakestDimension?.key === dimension.key;

                return (
                  <details key={dimension.key} open={isPrimaryGap} className="overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50/70">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900">{dimension.label}</p>
                        <p className="mt-1 text-xs text-stone-600">
                          {dimension.score}/{dimension.maxScore} ({dimension.percentage}%) · {failed} fail · {unknown} unknown · {passed} pass
                        </p>
                      </div>
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-700">
                        Expand
                      </span>
                    </summary>

                    <div className="border-t border-stone-200 px-4 py-3">
                      <div className="mb-3 h-2 overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#06b6d4)]"
                          style={{ width: `${Math.max(0, Math.min(100, dimension.percentage))}%` }}
                        />
                      </div>

                      <div className="space-y-2">
                        {dimension.checks.map((check) => {
                          const tone = verdictTone(check.verdict);
                          return (
                            <div key={check.id} className={cn('rounded-xl border p-3', tone.shell)}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={cn('inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold', tone.shell)}>
                                      {tone.icon}
                                    </span>
                                    <p className={cn('text-sm font-medium', tone.label)}>{check.label}</p>
                                  </div>
                                  <p className="mt-1 text-xs leading-5 text-stone-600">{check.detail}</p>
                                </div>
                                <span className="shrink-0 text-xs font-semibold text-stone-700">
                                  {check.points}/{check.maxPoints}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                );
              })}
            </section>
          </>
        )}
      </div>

      {report && !report.hasPaid && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="text-xs text-stone-700">
              Ready to ship fixes for <span className="font-semibold text-stone-900">{getDomain(report.url)}</span>?
            </p>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="aiso-button aiso-button-primary px-4 py-2 text-xs"
            >
              {checkoutLoading ? 'Loading...' : 'Fix Everything — $99'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoPill({
  label,
  value,
  tone = 'text-stone-900',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white/75 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className={cn('mt-1 truncate text-sm font-semibold', tone)}>{value}</p>
    </div>
  );
}

function MetricStack({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; tone: string }[];
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="text-sm text-stone-600">{row.label}</span>
            <span className={cn('text-sm font-semibold', row.tone)}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
