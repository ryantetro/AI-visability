'use client';

import { useEffect, useState } from 'react';
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { ExportButton } from '@/components/ui/export-button';
import { cn } from '@/lib/utils';
import {
  ENGINE_COLORS,
  PROVIDER_DISPLAY_ORDER,
  PROVIDER_LABELS,
  REFERRER_ENGINE_ORDER,
  REFERRER_ENGINE_LABELS,
} from '../lib/constants';
import { AI_ENGINES } from '@/lib/ai-engines';
import { EngineIcon } from '../panels/shared';
import { MonitoringTrendsPanel } from '../panels/monitoring-trends-panel';
import { PromptAnalyticsPanel } from '../panels/prompt-analytics-panel';
import { PlatformSnapshot } from '../dashboard/platform-snapshot';
import type { DashboardReportData, RecentScanData, ProviderTrafficSummary, ReferralTrafficSummary } from '../lib/types';

/* ── Types ──────────────────────────────────────────────────────── */

interface ProviderTimelineRow {
  date: string;
  [provider: string]: string | number;
}

interface EngineTimelineRow {
  date: string;
  [engine: string]: string | number;
}

type TimeRange = 7 | 14 | 30 | 90 | 0;

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: 0 },
];

/* ── Component ──────────────────────────────────────────────────── */

export function AnalyticsSection({
  report,
  recentScans,
  domain,
  lastScannedAt,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
}: {
  report: DashboardReportData;
  recentScans: RecentScanData[];
  domain: string;
  lastScannedAt: number | null;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onEnableMonitoring: () => void;
}) {
  const [days, setDays] = useState<TimeRange>(30);
  const [crawlerLoading, setCrawlerLoading] = useState(true);
  const [referralLoading, setReferralLoading] = useState(true);

  const [providerTimeline, setProviderTimeline] = useState<ProviderTimelineRow[]>([]);
  const [providerSummaries, setProviderSummaries] = useState<ProviderTrafficSummary[]>([]);
  const [crawlerTotalVisits, setCrawlerTotalVisits] = useState(0);

  const [engineTimeline, setEngineTimeline] = useState<EngineTimelineRow[]>([]);
  const [engineSummaries, setEngineSummaries] = useState<ReferralTrafficSummary[]>([]);
  const [referralTotalVisits, setReferralTotalVisits] = useState(0);

  // "All time" sends days=3650 to avoid the API cutoff bug
  const apiDays = days === 0 ? 3650 : days;

  useEffect(() => {
    let cancelled = false;

    async function fetchCrawler() {
      setCrawlerLoading(true);
      try {
        const res = await fetch(`/api/crawler-visits?domain=${encodeURIComponent(domain)}&days=${apiDays}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setProviderTimeline(data.providerTimeline ?? []);
          setProviderSummaries(data.providerSummaries ?? []);
          setCrawlerTotalVisits(data.totalVisits ?? 0);
        }
      } catch { /* silently fail */ }
      finally { if (!cancelled) setCrawlerLoading(false); }
    }

    async function fetchReferral() {
      setReferralLoading(true);
      try {
        const res = await fetch(`/api/referral-visits?domain=${encodeURIComponent(domain)}&days=${apiDays}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setEngineTimeline(data.engineTimeline ?? []);
          setEngineSummaries(data.engineSummaries ?? []);
          setReferralTotalVisits(data.totalVisits ?? 0);
        }
      } catch { /* silently fail */ }
      finally { if (!cancelled) setReferralLoading(false); }
    }

    void fetchCrawler();
    void fetchReferral();
    return () => { cancelled = true; };
  }, [domain, apiDays]);

  /* ── Derived values ────────────────────────────────────────── */

  const mentionRate = report.mentionSummary?.overallScore != null
    ? Math.round(report.mentionSummary.overallScore)
    : null;

  const aiVisibilityScore = report.score.scores.aiVisibility != null
    ? Math.round(report.score.scores.aiVisibility)
    : null;

  // Chart data formatting helpers
  const formatChartData = (timeline: Array<Record<string, string | number>>) =>
    timeline.map(row => {
      const d = new Date((row.date as string) + 'T00:00:00Z');
      const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const day = d.getUTCDate();
      return { ...row, label: `${month} ${day}` };
    });

  const crawlerChartData = formatChartData(providerTimeline);
  const referralChartData = formatChartData(engineTimeline);

  const effectiveDays = days === 0 ? crawlerChartData.length : days;
  const tickInterval = effectiveDays <= 14 ? 1 : effectiveDays <= 30 ? 2 : Math.max(1, Math.floor(crawlerChartData.length / 15));

  const activeCrawlerProviders = [
    ...PROVIDER_DISPLAY_ORDER.filter(p =>
      providerSummaries.some(s => s.provider === p && s.visits > 0)
    ),
    ...(providerSummaries.some(s => s.provider === 'other' && s.visits > 0) ? ['other'] : []),
  ];

  const activeReferralEngines = REFERRER_ENGINE_ORDER.filter(e =>
    engineSummaries.some(s => s.engine === e && s.visits > 0)
  );

  const crawlerTotal = providerSummaries.reduce((sum, s) => sum + s.visits, 0);
  const referralTotal = engineSummaries.reduce((sum, s) => sum + s.visits, 0);

  // Platform cards for PlatformSnapshot (same logic as dashboard-section)
  const mentions = report.mentionSummary;
  const platformCards = AI_ENGINES.map((engine) => {
    const stats = mentions?.engineBreakdown?.[engine];
    const status = mentions?.engineStatus?.[engine];
    return {
      engine,
      mentioned: stats?.mentioned ?? 0,
      total: stats?.total ?? 0,
      pct: stats?.total ? Math.round(((stats?.mentioned ?? 0) / stats.total) * 100) : 0,
      status: status?.status ?? 'not_backfilled',
    };
  }).filter((card) => card.total > 0 || card.status !== 'not_backfilled');

  const displayDays = days === 0 ? 'all time' : `${days}d`;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-6 sm:grid-cols-4">
        <KPICard label="Total Crawls" value={crawlerTotalVisits.toLocaleString()} loading={crawlerLoading} />
        <KPICard label="AI Referrals" value={referralTotalVisits.toLocaleString()} loading={referralLoading} />
        <KPICard
          label="Mention Rate"
          value={mentionRate != null ? `${mentionRate}%` : '--'}
          valueColor={mentionRate != null ? (mentionRate >= 50 ? 'text-[#25c972]' : mentionRate >= 25 ? 'text-[#ffbb00]' : 'text-[#ff5252]') : undefined}
        />
        <KPICard
          label="AI Visibility"
          value={aiVisibilityScore != null ? `${aiVisibilityScore}` : '--'}
          valueColor={aiVisibilityScore != null ? (aiVisibilityScore >= 80 ? 'text-[#25c972]' : aiVisibilityScore >= 60 ? 'text-[#ffbb00]' : aiVisibilityScore >= 40 ? 'text-[#ff8a1e]' : 'text-[#ff5252]') : undefined}
        />
      </div>

      {/* Time Range Picker */}
      <div className="flex items-center gap-1">
        {TIME_RANGES.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setDays(value)}
            className={cn(
              'px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors',
              days === value
                ? 'bg-white/10 text-white'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Two-column: Crawler Chart + Referral Chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">AI Crawlers</p>
              <p className="mt-1 text-[13px] text-zinc-400">
                {crawlerLoading ? 'Loading...' : `${crawlerTotalVisits.toLocaleString()} visits (${displayDays})`}
              </p>
            </div>
            <ExportButton exportType="crawler-visits" domain={domain} days={apiDays} featureGate="full_export" />
          </div>
          {crawlerLoading ? (
            <LoadingSpinner />
          ) : crawlerChartData.length > 0 ? (
            <>
              <div className="mt-4 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={crawlerChartData} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                      tickLine={false}
                      interval={tickInterval}
                      tick={{ fontSize: 10, fill: '#52525b' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#3f3f46' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={32}
                    />
                    <Tooltip content={<ChartTooltip labels={PROVIDER_LABELS} />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                    {activeCrawlerProviders.map(provider => (
                      <Line
                        key={provider}
                        type="monotone"
                        dataKey={provider}
                        stroke={ENGINE_COLORS[provider] ?? '#71717a'}
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: '#0a0a0c', stroke: ENGINE_COLORS[provider] ?? '#71717a', strokeWidth: 2 }}
                        activeDot={{ r: 4, fill: ENGINE_COLORS[provider] ?? '#71717a', stroke: '#0a0a0c', strokeWidth: 2 }}
                        style={{ filter: `drop-shadow(0 0 4px ${ENGINE_COLORS[provider] ?? '#71717a'}44)` }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend providers={activeCrawlerProviders} labels={PROVIDER_LABELS} />
            </>
          ) : (
            <EmptyChart label="No crawler data for this period" />
          )}
        </DashboardPanel>

        <DashboardPanel className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">AI Referrals</p>
              <p className="mt-1 text-[13px] text-zinc-400">
                {referralLoading ? 'Loading...' : `${referralTotalVisits.toLocaleString()} visits (${displayDays})`}
              </p>
            </div>
            <ExportButton exportType="referral-visits" domain={domain} days={apiDays} featureGate="full_export" />
          </div>
          {referralLoading ? (
            <LoadingSpinner />
          ) : referralChartData.length > 0 ? (
            <>
              <div className="mt-4 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={referralChartData} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                      tickLine={false}
                      interval={tickInterval}
                      tick={{ fontSize: 10, fill: '#52525b' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#3f3f46' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={32}
                    />
                    <Tooltip content={<ChartTooltip labels={REFERRER_ENGINE_LABELS} />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                    {activeReferralEngines.map(engine => (
                      <Line
                        key={engine}
                        type="monotone"
                        dataKey={engine}
                        stroke={ENGINE_COLORS[engine] ?? '#71717a'}
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: '#0a0a0c', stroke: ENGINE_COLORS[engine] ?? '#71717a', strokeWidth: 2 }}
                        activeDot={{ r: 4, fill: ENGINE_COLORS[engine] ?? '#71717a', stroke: '#0a0a0c', strokeWidth: 2 }}
                        style={{ filter: `drop-shadow(0 0 4px ${ENGINE_COLORS[engine] ?? '#71717a'}44)` }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend providers={activeReferralEngines} labels={REFERRER_ENGINE_LABELS} />
            </>
          ) : (
            <EmptyChart label="No referral data for this period" />
          )}
        </DashboardPanel>
      </div>

      {/* Two-column: Top Providers + Top Referral Engines */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Top Crawler Providers
          </p>
          <div className="mt-4 space-y-3">
            {providerSummaries.length > 0 ? providerSummaries.map((s, i) => {
              const pct = crawlerTotal > 0 ? Math.round((s.visits / crawlerTotal) * 100) : 0;
              return (
                <RankedRow
                  key={s.provider}
                  rank={i + 1}
                  engine={s.provider}
                  label={PROVIDER_LABELS[s.provider] ?? s.provider}
                  value={s.visits}
                  pct={pct}
                  maxValue={Math.max(...providerSummaries.map(x => x.visits), 1)}
                />
              );
            }) : (
              <p className="text-[12px] text-zinc-500">No crawler data available</p>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Top Referral Engines
          </p>
          <div className="mt-4 space-y-3">
            {engineSummaries.length > 0 ? engineSummaries.map((s, i) => {
              const pct = referralTotal > 0 ? Math.round((s.visits / referralTotal) * 100) : 0;
              return (
                <RankedRow
                  key={s.engine}
                  rank={i + 1}
                  engine={s.engine}
                  label={REFERRER_ENGINE_LABELS[s.engine] ?? s.engine}
                  value={s.visits}
                  pct={pct}
                  maxValue={Math.max(...engineSummaries.map(x => x.visits), 1)}
                />
              );
            }) : (
              <p className="text-[12px] text-zinc-500">No referral data available</p>
            )}
          </div>
        </DashboardPanel>
      </div>

      {/* Score Trends — full width */}
      <MonitoringTrendsPanel
        recentScans={recentScans}
        domain={domain}
        lastScannedAt={lastScannedAt}
        monitoringConnected={monitoringConnected}
        monitoringLoading={monitoringLoading}
        onEnableMonitoring={onEnableMonitoring}
      />

      {/* Prompt Mention Trends */}
      <PromptAnalyticsPanel domain={domain} />

      {/* Platform Breakdown */}
      {platformCards.length > 0 && (
        <DashboardPanel className="p-5">
          <PlatformSnapshot platformCards={platformCards} />
        </DashboardPanel>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function KPICard({
  label,
  value,
  valueColor,
  loading,
}: {
  label: string;
  value: string;
  valueColor?: string;
  loading?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={cn('mt-1.5 text-3xl font-bold tabular-nums tracking-tight', valueColor ?? 'text-white')}>
        {loading ? (
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600/30 border-t-zinc-400" />
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
        <p className="text-xs text-zinc-500">Loading data...</p>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="mt-4 flex h-[240px] items-center justify-center rounded-xl border border-dashed border-white/8 bg-white/[0.02]">
      <p className="text-[12px] text-zinc-500">{label}</p>
    </div>
  );
}

function ChartLegend({
  providers,
  labels,
}: {
  providers: readonly string[];
  labels: Record<string, string>;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
      {providers.map(p => (
        <div key={p} className="flex items-center gap-1.5">
          <EngineIcon engine={p} className="size-3.5" style={{ color: ENGINE_COLORS[p] ?? '#71717a' }} />
          <span className="text-[10px] font-medium text-zinc-400">{labels[p] ?? p}</span>
        </div>
      ))}
    </div>
  );
}

function RankedRow({
  rank,
  engine,
  label,
  value,
  pct,
  maxValue,
}: {
  rank: number;
  engine: string;
  label: string;
  value: number;
  pct: number;
  maxValue: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-right text-[12px] font-bold tabular-nums text-zinc-600">{rank}</span>
      <EngineIcon engine={engine} className="size-4 shrink-0" style={{ color: ENGINE_COLORS[engine] ?? '#71717a' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12px] font-semibold text-zinc-200">{label}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-bold tabular-nums text-white">{value.toLocaleString()}</span>
            <span className="text-[10px] tabular-nums text-zinc-500">({pct}%)</span>
          </div>
        </div>
        <div className="mt-1 h-[3px] w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round((value / maxValue) * 100)}%`,
              backgroundColor: ENGINE_COLORS[engine] ?? '#71717a',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  labels,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
  labels: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-zinc-400 mb-1.5">{label}</p>
      {payload
        .filter(p => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .map(p => (
          <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
            <EngineIcon engine={p.dataKey} className="size-3.5" style={{ color: ENGINE_COLORS[p.dataKey] ?? '#71717a' }} />
            <span className="text-[11px] text-zinc-300">{labels[p.dataKey] ?? p.dataKey}</span>
            <span className="ml-auto text-[11px] font-semibold tabular-nums text-white">{p.value}</span>
          </div>
        ))
      }
    </div>
  );
}
