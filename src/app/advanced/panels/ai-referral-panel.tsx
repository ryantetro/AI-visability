'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { ExportButton } from '@/components/ui/export-button';
import { cn } from '@/lib/utils';
import { REFERRER_ENGINE_ORDER, REFERRER_ENGINE_LABELS, ENGINE_COLORS } from '../lib/constants';
import { formatRelativeTime } from '../lib/utils';
import { EngineIcon } from './shared';
import type { ReferralTrafficSummary } from '../lib/types';

interface EngineTimelineRow {
  date: string;
  [engine: string]: string | number;
}

export function AIReferralPanel({
  domain,
  trackingLastUsedAt,
  tier,
}: {
  domain: string;
  trackingLastUsedAt?: string | null;
  tier?: string;
}) {
  const searchParams = useSearchParams();
  const reportParam = searchParams.get('report');
  const settingsHref = reportParam
    ? `/settings?report=${encodeURIComponent(reportParam)}`
    : '/settings';

  const [engineTimeline, setEngineTimeline] = useState<EngineTimelineRow[]>([]);
  const [engineSummaries, setEngineSummaries] = useState<ReferralTrafficSummary[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const referralRes = await fetch(`/api/referral-visits?domain=${encodeURIComponent(domain)}&days=${days}`);
        if (referralRes.ok) {
          const data = await referralRes.json();
          setEngineTimeline(data.engineTimeline ?? []);
          setEngineSummaries(data.engineSummaries ?? []);
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
            <p className="text-xs text-gray-500">Loading referral data...</p>
          </div>
        </div>
      </DashboardPanel>
    );
  }

  if (totalVisits === 0 && engineSummaries.length === 0) {
    return (
      <DashboardPanel className="p-6">
        <SectionTitle
          eyebrow="AI Referrals"
          title="AI Referral Traffic"
          description="Referral visits: real people who opened your site from an AI chat or search product."
        />
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {trackingLastUsedAt ? 'Site is talking to us · waiting for referral clicks' : 'Waiting for your site to send data'}
            </span>
          </div>

          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {trackingLastUsedAt
              ? `No AI referral visits in the last ${days} days`
              : 'Waiting for referral traffic'}
          </h3>
          <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed text-gray-500">
            {trackingLastUsedAt ? (
              <>
                Last contact:{' '}
                <span className="font-medium text-gray-700">
                  {formatRelativeTime(new Date(trackingLastUsedAt).getTime())}
                </span>
                . This chart only counts visits where the browser sent an AI product as the referrer. Those are rarer than bot crawls (shown above). An empty graph here can be normal for a while.
              </>
            ) : (
              <>
                We have not received any hit from your production site yet, so we can't show referrals or confirm the install. After the first successful event, this section will focus on <span className="text-gray-700">clicks from AI products</span> only — not bots.
              </>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={settingsHref}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500 underline decoration-gray-300 underline-offset-2 hover:text-gray-800"
            >
              Tracking settings
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {REFERRER_ENGINE_ORDER.map((engine) => (
              <span
                key={engine}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1"
              >
                <EngineIcon engine={engine} className="size-3.5" style={{ color: ENGINE_COLORS[engine] }} />
                <span className="text-[11px] font-medium text-gray-600">{REFERRER_ENGINE_LABELS[engine]}</span>
              </span>
            ))}
          </div>
          {tier === 'starter' && (
            <p className="mt-4 text-[11px] text-gray-500">Upgrade to Pro for full referral timeline and trends.</p>
          )}
          {tier === 'pro' && (
            <p className="mt-4 text-[11px] text-gray-500">Upgrade to Growth to export referral data as CSV.</p>
          )}
        </div>
      </DashboardPanel>
    );
  }

  // Active engines in data
  const activeEngines = REFERRER_ENGINE_ORDER.filter(e =>
    engineSummaries.some(s => s.engine === e && s.visits > 0)
  );

  // Chart data with readable labels
  const chartData = engineTimeline.map(row => {
    const d = new Date(row.date + 'T00:00:00Z');
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = d.getUTCDate();
    return { ...row, label: `${month} ${day}` };
  });

  const tickInterval = days <= 14 ? 1 : days <= 30 ? 2 : 6;
  const maxVisits = Math.max(...engineSummaries.map(s => s.visits), 1);
  const totalAll = engineSummaries.reduce((sum, s) => sum + s.visits, 0);

  return (
    <DashboardPanel className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          eyebrow="AI Referrals"
          title="AI Referral Traffic"
          description={`${totalVisits} human visit${totalVisits === 1 ? '' : 's'} from AI engines in the last ${days} days.`}
        />
        <div className="flex items-center gap-2 mt-1">
          <div className="flex gap-1">
            {[14, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-medium rounded transition-colors',
                  days === d
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          <ExportButton
            exportType="referral-visits"
            domain={domain}
            days={days}
            featureGate="full_export"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-0">
        {/* Chart area */}
        <div className="flex-1 min-w-0">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                  tickLine={false}
                  interval={tickInterval}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={32}
                />
                <Tooltip
                  content={<ReferralChartTooltip />}
                  cursor={{ stroke: 'rgba(0,0,0,0.08)' }}
                />
                {activeEngines.map(engine => (
                  <Line
                    key={engine}
                    type="monotone"
                    dataKey={engine}
                    stroke={ENGINE_COLORS[engine] ?? '#71717a'}
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: '#ffffff',
                      stroke: ENGINE_COLORS[engine] ?? '#71717a',
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5,
                      fill: ENGINE_COLORS[engine] ?? '#71717a',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                    }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="-mt-2 flex items-center justify-center gap-5">
            {activeEngines.map(engine => (
              <div key={engine} className="flex items-center gap-2">
                <EngineIcon engine={engine} className="size-4" style={{ color: ENGINE_COLORS[engine] ?? '#71717a' }} />
                <span className="text-[11px] font-medium text-gray-600">
                  {REFERRER_ENGINE_LABELS[engine] ?? engine}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Engine rankings sidebar */}
        <div className="hidden lg:flex w-[220px] shrink-0 flex-col border-l border-gray-200 pl-6 ml-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
            Top Engines
          </p>
          <div className="mt-5 space-y-5">
            {engineSummaries.map((s, i) => {
              const pct = totalAll > 0 ? Math.round((s.visits / totalAll) * 100) : 0;
              return (
                <div key={s.engine} className="flex items-start gap-3">
                  <span className="mt-0.5 text-[13px] font-bold tabular-nums text-gray-400">
                    {i + 1}
                  </span>
                  <EngineIcon engine={s.engine} className="mt-0.5 size-5 shrink-0" style={{ color: ENGINE_COLORS[s.engine] ?? '#71717a' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-gray-800">
                      {REFERRER_ENGINE_LABELS[s.engine] ?? s.engine}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[15px] font-bold tabular-nums text-gray-900">
                        {s.visits}
                      </span>
                      <span className="text-[10px] text-gray-500">visits</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-[3px] flex-1 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.round((s.visits / maxVisits) * 100)}%`,
                            backgroundColor: ENGINE_COLORS[s.engine] ?? '#71717a',
                          }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-gray-500">{pct}%</span>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-500">{s.uniquePages} landing page{s.uniquePages === 1 ? '' : 's'}</div>
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

/* Trend Badge */
function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) {
    return (
      <div className="mt-1.5 flex items-center gap-1 text-gray-400">
        <Minus className="h-3 w-3" />
        <span className="text-[10px] font-medium">0%</span>
      </div>
    );
  }
  const isPositive = trend > 0;
  return (
    <div className={cn(
      'mt-1.5 flex items-center gap-1',
      isPositive ? 'text-emerald-600' : 'text-red-500',
    )}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span className="text-[10px] font-medium">
        {isPositive ? '+' : ''}{trend}%
      </span>
    </div>
  );
}

/* Custom Tooltip */
function ReferralChartTooltip({
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
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-gray-500 mb-1.5">{label}</p>
      {payload
        .filter(p => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .map(p => (
          <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
            <EngineIcon engine={p.dataKey} className="size-3.5" style={{ color: ENGINE_COLORS[p.dataKey] ?? '#71717a' }} />
            <span className="text-[11px] text-gray-700">
              {REFERRER_ENGINE_LABELS[p.dataKey] ?? p.dataKey}
            </span>
            <span className="ml-auto text-[11px] font-semibold tabular-nums text-gray-900">
              {p.value}
            </span>
          </div>
        ))
      }
    </div>
  );
}
