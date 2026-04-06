'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LayoutGrid,
  List,
  Rocket,
  Settings,
  X,
} from 'lucide-react';

import { FloatingFeedback } from '@/components/ui/floating-feedback';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { getRecentScanEntries } from '@/lib/recent-scans';
import { getDomain, ensureProtocol, getFaviconUrl } from '@/lib/url-utils';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { LockedFeatureOverlay } from '@/components/ui/locked-feature-overlay';
import { UnlockFeaturesModal } from '@/components/ui/unlock-features-modal';
import { usePlan } from '@/hooks/use-plan';
import { buildLoginHref, getCurrentAppPath } from '@/lib/app-paths';
import { canAccess, NAV_GATES, type PaymentPlanString, type PlanTier } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface WebHealthPillar {
  key: string;
  percentage: number | null;
}

interface RecentScanData {
  id: string;
  url: string;
  status: string;
  score?: number;
  scores?: {
    overall: number | null;
    aiVisibility: number;
    webHealth: number | null;
    potentialLift: number | null;
  };
  webHealth?: {
    pillars?: WebHealthPillar[];
  } | null;
  mentionScore?: number | null;
  createdAt: number;
  completedAt?: number;
  hasEmail: boolean;
}

function formatDateShort(timestamp?: number) {
  if (!timestamp) return '--';
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatRelative(timestamp?: number) {
  if (!timestamp) return '';
  const sec = Math.floor((Date.now() - timestamp) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} d ago`;
  return formatDateShort(timestamp);
}

function getAnalysisHref(scan: Pick<RecentScanData, 'id' | 'hasEmail' | 'status'>) {
  return `/report?report=${scan.id}`;
}

function getPillarScore(webHealth: RecentScanData['webHealth'], key: string): number | null {
  const pillar = webHealth?.pillars?.find((p) => p.key === key);
  return pillar?.percentage ?? null;
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-[var(--text-muted)]';
  if (score >= 80) return 'text-[#25c972]';
  if (score >= 60) return 'text-[#ffbb00]';
  if (score >= 40) return 'text-[#ff8a1e]';
  return 'text-[#ff5252]';
}

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tier, loading: planLoading } = usePlan();
  const storageScope = user?.id ?? user?.email ?? null;
  const [recentScans, setRecentScans] = useState<RecentScanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grouped' | 'timeline'>('grouped');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const requiredTier: Exclude<PlanTier, 'free'> = (NAV_GATES.history ?? 'starter') as Exclude<PlanTier, 'free'>;
  const hasHistoryAccess = canAccess(tier, requiredTier);

  useEffect(() => {
    if (planLoading) {
      return;
    }

    if (!hasHistoryAccess) {
      setRecentScans([]);
      setLoading(false);
      return;
    }

    let active = true;

    async function loadScans() {
      // Primary: fetch all user scans from DB in a single call
      try {
        const res = await fetch('/api/user/scans');
        if (res.ok) {
          const data = await res.json();
          const scans = (data.scans ?? []) as RecentScanData[];
          if (active) {
            setRecentScans(
              scans.sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
            );
            setLoading(false);
          }
          return;
        }
      } catch { /* fall through to localStorage fallback */ }

      // Fallback: load from localStorage scan IDs
      const recentIds = getRecentScanEntries(storageScope).map((entry) => entry.id);
      if (recentIds.length === 0) {
        if (active) {
          setRecentScans([]);
          setLoading(false);
        }
        return;
      }

      const results = await Promise.all(
        recentIds.map(async (id) => {
          try {
            const res = await fetch(`/api/scan/${id}`);
            if (!res.ok) return null;
            return (await res.json()) as RecentScanData;
          } catch {
            return null;
          }
        })
      );

      if (!active) return;

      setRecentScans(
        results
          .filter((entry): entry is RecentScanData => Boolean(entry))
          .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
      );
      setLoading(false);
    }

    void loadScans();

    return () => {
      active = false;
    };
  }, [hasHistoryAccess, planLoading, storageScope]);

  const handleUnlock = async (plan: PaymentPlanString) => {
    setUnlockLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          returnPath: getCurrentAppPath('/history'),
        }),
      });

      if (res.status === 401) {
        router.push(buildLoginHref(getCurrentAppPath('/history')));
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to start checkout right now.');
      }

      const session = await res.json();
      if (typeof session.url !== 'string' || session.url.length === 0) {
        throw new Error('Checkout session did not include a redirect URL.');
      }

      setUnlockModalOpen(false);

      if (/^https?:\/\//i.test(session.url)) {
        window.location.href = session.url;
        return;
      }

      router.push(session.url);
    } catch (error) {
      console.error('[history] failed to start upgrade checkout', error);
    } finally {
      setUnlockLoading(false);
    }
  };

  if (planLoading) {
    return (
      <div className="relative mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="mt-6">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-8 text-center text-sm text-[var(--text-muted)]">
            Loading history...
          </div>
        </section>
      </div>
    );
  }

  if (!hasHistoryAccess) {
    return (
      <div className="relative mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="mt-6">
          <LockedFeatureOverlay
            featureName="History"
            requiredTier={requiredTier}
            onUpgrade={() => setUnlockModalOpen(true)}
          />
        </section>
        <UnlockFeaturesModal
          open={unlockModalOpen}
          onOpenChange={setUnlockModalOpen}
          onUnlock={(plan) => void handleUnlock(plan)}
          loading={unlockLoading}
          contextFeature="History"
          contextTier={requiredTier}
        />
      </div>
    );
  }

  return (
      <div className="relative mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="mt-6">
          <h1 className="text-[2rem] font-bold tracking-tight text-[var(--text-primary)]">
            History
          </h1>
          <p className="mt-2 text-[15px] text-[var(--text-muted)]">
            Browse every completed run, track how scores evolve, and reopen any report in a click.
          </p>

          <div className="mt-6 grid grid-cols-3 items-center gap-4">
            <div />
            <div className="flex justify-center">
              <div className="inline-flex h-[38px] items-center rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  className={cn(
                    'inline-flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors',
                    viewMode === 'grouped'
                      ? 'bg-white/[0.08] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grouped
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={cn(
                    'inline-flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors',
                    viewMode === 'timeline'
                      ? 'bg-white/[0.08] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  <List className="h-4 w-4" />
                  Timeline
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-[38px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-white/[0.06]"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>

          {viewMode === 'grouped' ? (
            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                  Loading your recent scans...
                </div>
              ) : recentScans.length > 0 ? (
                (() => {
                  const groups = recentScans.reduce((acc, scan) => {
                    const domain = getDomain(scan.url);
                    if (!acc[domain]) acc[domain] = [];
                    acc[domain].push(scan);
                    return acc;
                  }, {} as Record<string, RecentScanData[]>);

                  return Object.entries(groups).map(([domain, scans]) => {
                    const sorted = scans.sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
                    const latest = sorted[0];
                    const scores = sorted.map((s) => s.scores?.overall ?? s.score ?? null).filter((n): n is number => n != null);
                    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                    const bestScore = scores.length ? Math.max(...scores) : null;
                    const lastRun = latest.completedAt ?? latest.createdAt;
                    const isExpanded = expandedDomain === domain;

                    const chartData = [...sorted]
                      .reverse()
                      .map((s) => {
                        const ts = s.completedAt ?? s.createdAt;
                        const d = new Date(ts);
                        return {
                          date: `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`,
                          score: s.scores?.overall ?? s.score ?? 0,
                        };
                      });

                    return (
                      <div
                        key={domain}
                        className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedDomain(isExpanded ? null : domain)}
                          onKeyDown={(e) => e.key === 'Enter' && setExpandedDomain(isExpanded ? null : domain)}
                          className="group flex cursor-pointer items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.05]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                              <img
                                src={getFaviconUrl(domain, 32)}
                                alt=""
                                className="h-5 w-5 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.querySelector('[data-fallback]')?.classList.remove('hidden');
                                }}
                              />
                              <span data-fallback className="hidden absolute inset-0 items-center justify-center">
                                <Rocket className="h-4 w-4 text-indigo-400" />
                              </span>
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={getAnalysisHref(latest)}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] hover:underline"
                              >
                                {domain}
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </Link>
                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                {scans.length} {scans.length === 1 ? 'report' : 'reports'} • Last run {formatRelative(lastRun)}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <div className="flex gap-4 text-sm">
                              <div>
                                <span className={cn('font-semibold', scoreColor(avgScore))}>
                                  {avgScore ?? '--'}
                                </span>
                                <span className="ml-1 text-[var(--text-muted)]">Avg</span>
                              </div>
                              <div>
                                <span className={cn('font-bold', scoreColor(bestScore))}>
                                  {bestScore ?? '--'}
                                </span>
                                <span className="ml-1 text-[var(--text-muted)]">Best</span>
                              </div>
                              {latest.mentionScore != null && (
                                <div>
                                  <span className={cn('font-semibold', scoreColor(latest.mentionScore))}>
                                    {latest.mentionScore}
                                  </span>
                                  <span className="ml-1 text-[var(--text-muted)]">AI Mentions</span>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedDomain(isExpanded ? null : domain);
                              }}
                              className="rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-white/[0.08] px-5 py-4">
                            <div className="mb-4">
                              <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                  Score trend
                                </h3>
                                <span className="text-xs text-[var(--text-muted)]">Overall</span>
                              </div>
                              <div className="h-32 w-full">
                                <ResponsiveContainer width="100%" height={128} minWidth={0}>
                                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                    <XAxis
                                      dataKey="date"
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                    />
                                    <YAxis
                                      domain={[0, 100]}
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                      ticks={[0, 25, 50, 75, 100]}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="score"
                                      stroke="hsl(var(--chart-1))"
                                      strokeWidth={2}
                                      dot={{ r: 4, fill: 'hsl(var(--chart-1))' }}
                                      isAnimationActive={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-8 text-center text-sm text-[var(--text-secondary)]">
                  No saved scans yet. Start one from{' '}
                  <Link href="/#scan" className="text-white underline underline-offset-4">
                    the landing page
                  </Link>{' '}
                  or your dashboard.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1a]/80">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Site
                    </th>
                    <th className="px-4 py-3 text-center text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Overall
                    </th>
                    <th className="px-4 py-3 text-center text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Scores
                    </th>
                    <th className="px-4 py-3 text-right text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                        Loading your recent scans...
                      </td>
                    </tr>
                  ) : recentScans.length > 0 ? (
                    recentScans.map((scan) => {
                      const overall = scan.scores?.overall ?? scan.score ?? null;
                      const speed = getPillarScore(scan.webHealth, 'performance');
                      const quality = getPillarScore(scan.webHealth, 'quality');
                      const security = getPillarScore(scan.webHealth, 'security');
                      const ts = scan.completedAt ?? scan.createdAt;

                      return (
                        <tr
                          key={scan.id}
                          className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={getAnalysisHref(scan)}
                              className="group flex items-start gap-3"
                            >
                              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                                <img
                                  src={getFaviconUrl(getDomain(scan.url), 32)}
                                  alt=""
                                  className="h-5 w-5 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.querySelector('[data-fallback]')?.classList.remove('hidden');
                                  }}
                                />
                                <span data-fallback className="hidden absolute inset-0 items-center justify-center">
                                  <Rocket className="h-4 w-4 text-indigo-400" />
                                </span>
                              </span>
                              <div className="min-w-0">
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] group-hover:underline">
                                  {getDomain(scan.url)}
                                  <ExternalLink className="h-3 w-3 opacity-60" />
                                </span>
                                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                  {ensureProtocol(scan.url)}
                                </p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('text-lg font-semibold', scoreColor(overall))}>
                              {overall ?? '--'}
                            </span>
                            <span className="text-[var(--text-primary)]"> /100</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
                              <div>
                                <span className="block text-[11px] text-[var(--text-muted)]">SPEED</span>
                                <span className="font-medium text-[var(--text-primary)]">
                                  {speed ?? '--'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-[var(--text-muted)]">QUALITY</span>
                                <span className="font-medium text-[var(--text-primary)]">
                                  {quality ?? '--'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-[var(--text-muted)]">SECURITY</span>
                                <span className="font-medium text-[var(--text-primary)]">
                                  {security ?? '--'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="block text-sm font-medium text-[var(--text-primary)]">
                              {formatDateShort(ts)}
                            </span>
                            <span className="block text-xs text-[var(--text-muted)]">
                              {formatRelative(ts)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                        No saved scans yet. Start one from{' '}
                        <Link href="/#scan" className="text-white underline underline-offset-4">
                          the landing page
                        </Link>{' '}
                        or your dashboard.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <FloatingFeedback userEmail={user?.email} />

        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent
            side="center"
            showClose={false}
            className="border-white/10 bg-[#1a1a1a] p-0"
          >
            <div className="flex flex-col p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Default Visibility
                </h2>
                <SheetClose className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]">
                  <X className="h-5 w-5" />
                </SheetClose>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Default leaderboard visibility
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                      Workspace-level defaults are not configurable yet.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                    Coming soon
                  </span>
                </div>

                <p className="text-[13px] text-[var(--text-muted)]">
                  We removed the inactive toggle here so this panel only shows settings that are currently wired up.
                </p>

                <div className="rounded-lg bg-[#3d281a] px-4 py-3">
                  <p className="text-[13px] text-amber-400/95">
                    When leaderboard defaults ship, they should apply to future reports only. Existing public listings will stay domain-specific.
                  </p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
  );
}
