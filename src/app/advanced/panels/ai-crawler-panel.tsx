'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { ArrowRight, CheckCircle2, Code2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { ENGINE_COLORS, PROVIDER_DISPLAY_ORDER, PROVIDER_LABELS } from '../lib/constants';
import { formatRelativeTime } from '../lib/utils';
import { EngineIcon } from './shared';
import type { ProviderTrafficSummary } from '../lib/types';

interface ProviderTimelineRow {
  date: string;
  [provider: string]: string | number;
}

export function AICrawlerPanel({
  domain,
  trackingReady: trackingReadyProp,
  trackingLastUsedAt: trackingLastUsedAtProp,
}: {
  domain: string;
  trackingReady?: boolean;
  trackingLastUsedAt?: string | null;
}) {
  const searchParams = useSearchParams();
  const [providerTimeline, setProviderTimeline] = useState<ProviderTimelineRow[]>([]);
  const [providerSummaries, setProviderSummaries] = useState<ProviderTrafficSummary[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [internalTrackingReady, setInternalTrackingReady] = useState(false);
  const [internalLastUsedAt, setInternalLastUsedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const reportParam = searchParams.get('report');
  const settingsHref = reportParam
    ? `/settings?report=${encodeURIComponent(reportParam)}`
    : '/settings';

  // Use props when provided (dashboard lifts state), otherwise fetch internally (brand page)
  const trackingReady = trackingReadyProp ?? internalTrackingReady;
  const trackingLastUsedAt =
    trackingLastUsedAtProp !== undefined ? trackingLastUsedAtProp : internalLastUsedAt;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const fetches: Promise<Response>[] = [
          fetch(`/api/crawler-visits?domain=${encodeURIComponent(domain)}&days=${days}`),
        ];
        // Only fetch tracking key if not provided via prop
        if (trackingReadyProp === undefined) {
          fetches.push(fetch(`/api/user/tracking-key?domain=${encodeURIComponent(domain)}`));
        }

        const results = await Promise.all(fetches);
        const crawlerRes = results[0];
        if (crawlerRes.ok) {
          const data = await crawlerRes.json();
          setProviderTimeline(data.providerTimeline ?? []);
          setProviderSummaries(data.providerSummaries ?? []);
          setTotalVisits(data.totalVisits ?? 0);
        }

        if (trackingReadyProp === undefined && results[1]?.ok) {
          const data = await results[1].json();
          setInternalTrackingReady(Boolean(data.siteKey));
          setInternalLastUsedAt(typeof data.lastUsedAt === 'string' ? data.lastUsedAt : null);
        }
      } catch { /* silently fail */ } finally { setLoading(false); }
    })();
  }, [domain, days, trackingReadyProp]);

  if (loading) {
    return (
      <DashboardPanel className="p-6">
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
            <p className="text-xs text-zinc-500">Loading traffic data...</p>
          </div>
        </div>
      </DashboardPanel>
    );
  }

  if (totalVisits === 0 && providerSummaries.length === 0) {
    return (
      <DashboardPanel className="p-6">
        <SectionTitle
          eyebrow="AI Crawlers"
          title="Traffic Analysis"
          description="Crawler visits: when AI bots (e.g. ChatGPT, Perplexity) load pages on your site."
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_320px]">
          <div className="rounded-[1.4rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035)_0%,rgba(255,255,255,0.015)_100%)] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                trackingReady
                  ? 'border border-zinc-600/40 bg-white/[0.04] text-zinc-400'
                  : 'border border-amber-500/25 bg-amber-500/10 text-amber-300'
              )}>
                {trackingReady ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Code2 className="h-3.5 w-3.5" />}
                {trackingReady ? 'Snippet saved · waiting for crawler visits' : 'Tracking not set up'}
              </span>
            </div>

            <h3 className="mt-4 text-lg font-semibold text-white">
              {!trackingReady
                ? 'Connect your site to see crawler traffic'
                : trackingLastUsedAt
                  ? `No crawler visits in the last ${days} days`
                  : 'Waiting for your first signal'}
            </h3>
            <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed text-zinc-400">
              {!trackingReady ? (
                'Create a site key in Settings, add the middleware snippet to your app, and deploy. This chart only shows data after crawlers request your pages.'
              ) : trackingLastUsedAt ? (
                <>
                  Last contact from your site:{' '}
                  <span className="font-medium text-zinc-300">
                    {formatRelativeTime(new Date(trackingLastUsedAt).getTime())}
                  </span>
                  . Crawlers may be quiet for stretches. Try a longer range (90d) or check again after bots revisit your domain.
                </>
              ) : (
                <>
                  You’re set up on our side. We’re waiting for your live site to send its first event (a bot crawl or a visitor from an AI product). Until then this chart stays empty. If it’s been more than a day, confirm the snippet is on the <span className="text-zinc-300">same domain</span> as this report and that production is deployed.
                </>
              )}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={settingsHref}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                {trackingReady ? 'Tracking settings' : 'Set up tracking'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-white/8 bg-[#0b0b0d] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">At a glance</p>
            <div className="mt-4 space-y-3">
              {[
                trackingReady
                  ? 'This block = automated AI bots hitting your pages.'
                  : 'Add tracking in Settings for this domain.',
                'Human clicks from ChatGPT-style products are in AI Referrals below — not here.',
                trackingReady
                  ? 'No graph yet = no crawler hits recorded for this period (or no signal from your site yet).'
                  : 'After setup, data appears when crawlers visit.',
              ].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-zinc-300">
                    {index + 1}
                  </span>
                  <p className="text-[12px] leading-5 text-zinc-400">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardPanel>
    );
  }

  // Determine active providers (those with data in current period)
  const activeProviders = PROVIDER_DISPLAY_ORDER.filter(p =>
    providerSummaries.some(s => s.provider === p && s.visits > 0)
  );

  // Include "other" in sidebar only if it has visits
  const otherSummary = providerSummaries.find(s => s.provider === 'other');
  const totalAllVisits = providerSummaries.reduce((sum, s) => sum + s.visits, 0);
  const showOtherInSidebar = otherSummary && otherSummary.visits > 0;

  // Show "other" in chart only if >= 5% of total
  const showOtherInChart = otherSummary && totalAllVisits > 0 && (otherSummary.visits / totalAllVisits) >= 0.05;
  const chartProviders = showOtherInChart
    ? [...activeProviders, 'other' as const]
    : activeProviders;

  // Format chart data with readable date labels
  const chartData = providerTimeline.map(row => {
    const d = new Date(row.date + 'T00:00:00Z');
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = d.getUTCDate();
    return {
      ...row,
      label: `${month} ${day}`,
    };
  });

  // Tick interval based on period
  const tickInterval = days <= 14 ? 1 : days <= 30 ? 2 : 6;

  // Max visits for sidebar progress bar
  const maxVisits = Math.max(...providerSummaries.map(s => s.visits), 1);

  // Sidebar entries: ranked provider summaries
  const sidebarEntries = providerSummaries.filter(s =>
    PROVIDER_DISPLAY_ORDER.includes(s.provider as typeof PROVIDER_DISPLAY_ORDER[number]) ||
    (s.provider === 'other' && showOtherInSidebar)
  );

  return (
    <DashboardPanel className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          eyebrow="AI Crawlers"
          title="Traffic Analysis"
          description={`${totalVisits} AI bot visit${totalVisits === 1 ? '' : 's'} detected in the last ${days} days.`}
        />
        <div className="flex gap-1 mt-1">
          {[14, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-medium rounded transition-colors',
                days === d
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-0">
        {/* Chart area */}
        <div className="flex-1 min-w-0">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 4 }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
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
                <Tooltip
                  content={<CrawlerChartTooltip />}
                  cursor={{ stroke: 'rgba(255,255,255,0.06)' }}
                />
                {chartProviders.map(provider => (
                  <Line
                    key={provider}
                    type="monotone"
                    dataKey={provider}
                    stroke={ENGINE_COLORS[provider] ?? '#71717a'}
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: '#0a0a0c',
                      stroke: ENGINE_COLORS[provider] ?? '#71717a',
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5,
                      fill: ENGINE_COLORS[provider] ?? '#71717a',
                      stroke: '#0a0a0c',
                      strokeWidth: 2,
                    }}
                    style={{ filter: `drop-shadow(0 0 4px ${ENGINE_COLORS[provider] ?? '#71717a'}44)` }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="-mt-2 flex items-center justify-center gap-5">
            {chartProviders.map(provider => (
              <div key={provider} className="flex items-center gap-2">
                <EngineIcon engine={provider} className="size-4" style={{ color: ENGINE_COLORS[provider] ?? '#71717a' }} />
                <span className="text-[11px] font-medium text-zinc-400">
                  {PROVIDER_LABELS[provider] ?? provider}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Providers leaderboard sidebar */}
        <div className="hidden lg:flex w-[220px] shrink-0 flex-col border-l border-white/[0.06] pl-6 ml-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Top Providers
          </p>
          <div className="mt-5 space-y-5">
            {sidebarEntries.map((s, i) => {
              const pct = totalAllVisits > 0 ? Math.round((s.visits / totalAllVisits) * 100) : 0;
              return (
                <div key={s.provider} className="flex items-start gap-3">
                  <span className="mt-0.5 text-[13px] font-bold tabular-nums text-zinc-600">
                    {i + 1}
                  </span>
                  <EngineIcon engine={s.provider} className="mt-0.5 size-5 shrink-0" style={{ color: ENGINE_COLORS[s.provider] ?? '#71717a' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-zinc-200">
                      {PROVIDER_LABELS[s.provider] ?? s.provider}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[15px] font-bold tabular-nums text-white">
                        {s.visits}
                      </span>
                      <span className="text-[10px] text-zinc-500">visits</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-[3px] flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.round((s.visits / maxVisits) * 100)}%`,
                            backgroundColor: ENGINE_COLORS[s.provider] ?? '#71717a',
                          }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-zinc-500">{pct}%</span>
                    </div>
                    <TrendBadge trend={s.trend} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}

/* ── Trend Badge ────────────────────────────────────────────────────────── */

function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) {
    return (
      <div className="mt-1.5 flex items-center gap-1 text-zinc-500">
        <Minus className="h-3 w-3" />
        <span className="text-[10px] font-medium">0%</span>
      </div>
    );
  }

  const isPositive = trend > 0;
  return (
    <div className={cn(
      'mt-1.5 flex items-center gap-1',
      isPositive ? 'text-emerald-400' : 'text-red-400',
    )}>
      {isPositive
        ? <TrendingUp className="h-3 w-3" />
        : <TrendingDown className="h-3 w-3" />
      }
      <span className="text-[10px] font-medium">
        {isPositive ? '+' : ''}{trend}%
      </span>
    </div>
  );
}

/* ── Custom Tooltip ─────────────────────────────────────────────────────── */

function CrawlerChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
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
            <span className="text-[11px] text-zinc-300">
              {PROVIDER_LABELS[p.dataKey] ?? p.dataKey}
            </span>
            <span className="ml-auto text-[11px] font-semibold tabular-nums text-white">
              {p.value}
            </span>
          </div>
        ))
      }
    </div>
  );
}
