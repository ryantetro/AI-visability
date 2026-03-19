'use client';

import { useEffect, useState } from 'react';
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { ENGINE_COLORS, PROVIDER_DISPLAY_ORDER, PROVIDER_LABELS } from '../lib/constants';
import { EngineIcon } from './shared';
import type { ProviderTrafficSummary } from '../lib/types';

interface ProviderTimelineRow {
  date: string;
  [provider: string]: string | number;
}

export function AICrawlerPanel({ domain }: { domain: string }) {
  const [providerTimeline, setProviderTimeline] = useState<ProviderTimelineRow[]>([]);
  const [providerSummaries, setProviderSummaries] = useState<ProviderTrafficSummary[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/crawler-visits?domain=${encodeURIComponent(domain)}&days=${days}`);
        if (res.ok) {
          const data = await res.json();
          setProviderTimeline(data.providerTimeline ?? []);
          setProviderSummaries(data.providerSummaries ?? []);
          setTotalVisits(data.totalVisits ?? 0);
        }
      } catch { /* silently fail */ } finally { setLoading(false); }
    })();
  }, [domain, days]);

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
        <SectionTitle eyebrow="AI Crawlers" title="Traffic Analysis" description="Monitor AI bot activity on your site." />
        <p className="mt-5 text-center text-[12px] text-zinc-500">
          No AI crawler visits detected yet. Visits will appear here once AI bots discover your site.
        </p>
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
                <EngineIcon engine={provider} className="size-4" />
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
                  <EngineIcon engine={s.provider} className="mt-0.5 size-5 shrink-0" />
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
            <EngineIcon engine={p.dataKey} className="size-3.5" />
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
