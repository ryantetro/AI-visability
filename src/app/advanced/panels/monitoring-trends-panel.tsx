'use client';

import { Bell } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { formatShortDate, formatRelativeTime, scoreColor } from '../lib/utils';
import type { RecentScanData } from '../lib/types';
import { getDomain } from '@/lib/url-utils';

const SCORE_COLOR = '#25c972';

function ScoreTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: number;
    payload?: { label?: string };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const value = payload[0]?.value;
  if (typeof value !== 'number') return null;
  return (
    <div className="pointer-events-none select-none rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-zinc-400 mb-1.5">{row?.label ?? label ?? '—'}</p>
      <div className="flex items-center gap-2 py-0.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: SCORE_COLOR }}
        />
        <span className="text-[11px] text-zinc-300">Score</span>
        <span className="ml-auto text-[11px] font-semibold tabular-nums text-white">
          {Math.round(value)}
        </span>
      </div>
    </div>
  );
}

function getTrendScore(scan: RecentScanData): number | null {
  return scan.scores?.overall ?? scan.score ?? null;
}

function getScanTimestamp(scan: RecentScanData): number {
  return scan.completedAt ?? scan.createdAt;
}

export function MonitoringTrendsPanel({
  recentScans,
  domain,
  lastScannedAt,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
}: {
  recentScans: RecentScanData[];
  domain: string;
  lastScannedAt: number | null;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onEnableMonitoring: () => void;
}) {
  const domainScans = recentScans
    .filter((scan) => getDomain(scan.url) === domain)
    .map((scan) => ({
      scan,
      timestamp: getScanTimestamp(scan),
      score: getTrendScore(scan),
    }))
    .filter((entry): entry is { scan: RecentScanData; timestamp: number; score: number } => entry.score != null)
    .sort((a, b) => a.timestamp - b.timestamp);

  const chartData = domainScans.map((entry) => {
    const d = new Date(entry.timestamp);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    return {
      timestamp: entry.timestamp,
      score: entry.score,
      label: `${month} ${day}`,
    };
  });

  const lastScan = domainScans[domainScans.length - 1]?.scan ?? null;
  const displayedLastScannedAt = lastScannedAt ?? (lastScan ? getScanTimestamp(lastScan) : null);
  const prevScan = domainScans.length >= 2 ? domainScans[domainScans.length - 2]?.scan ?? null : null;
  const scoreDelta =
    lastScan && prevScan && getTrendScore(lastScan) != null && getTrendScore(prevScan) != null
      ? Math.round((getTrendScore(lastScan) ?? 0) - (getTrendScore(prevScan) ?? 0))
      : null;

  return (
    <DashboardPanel id="monitoring" className="scroll-mt-6 p-5">
      <SectionTitle eyebrow="Monitoring" title="Score Trends" description="Track how your AI visibility score changes over time." />

      <div className="mt-5">
        {chartData.length >= 2 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 16, right: 24, bottom: 8, left: 4 }}
                >
                  <defs>
                    <filter id="score-glow">
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
                    tick={{ fontSize: 10, fill: '#52525b' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fontSize: 10, fill: '#3f3f46' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    content={<ScoreTrendTooltip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.06)' }}
                    wrapperStyle={{ pointerEvents: 'none' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={SCORE_COLOR}
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: '#0a0a0c',
                      stroke: SCORE_COLOR,
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5,
                      fill: SCORE_COLOR,
                      stroke: '#0a0a0c',
                      strokeWidth: 2,
                    }}
                    style={{ filter: `drop-shadow(0 0 4px ${SCORE_COLOR}44)` }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : chartData.length === 1 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-6 py-8 text-center">
            <p className={cn('text-3xl font-bold', scoreColor(chartData[0].score))}>
              {Math.round(chartData[0].score)}
            </p>
            <p className="text-[13px] text-zinc-400">Single data point on {formatShortDate(getScanTimestamp(lastScan!))}</p>
            <p className="text-[12px] text-zinc-500">Run more scans to track trends over time.</p>
          </div>
        ) : (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-white/8 bg-white/[0.02] px-6 py-8 text-center text-[13px] text-zinc-500">
            No score history yet. Run a scan to start tracking.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-zinc-400">
        <span>Last scanned: {displayedLastScannedAt ? formatRelativeTime(displayedLastScannedAt) : '--'}</span>
        {scoreDelta !== null && (
          <span className={scoreDelta >= 0 ? 'text-[#25c972]' : 'text-[#ff5252]'}>
            {scoreDelta >= 0 ? '+' : ''}{scoreDelta} since previous
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className={cn('inline-block h-2 w-2 rounded-full', monitoringConnected ? 'bg-[#25c972]' : 'bg-zinc-600')} />
          Monitoring: {monitoringConnected ? 'Active' : 'Inactive'}
        </span>
      </div>

      {!monitoringConnected && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onEnableMonitoring}
            disabled={monitoringLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Bell className="h-3.5 w-3.5" />
            {monitoringLoading ? 'Enabling...' : 'Enable monitoring'}
          </button>
        </div>
      )}
    </DashboardPanel>
  );
}
