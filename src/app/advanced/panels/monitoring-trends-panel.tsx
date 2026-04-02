'use client';

import { useId } from 'react';
import { Bell } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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

const axisFont =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function dayKeyFromTs(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Recharts XAxis tick: date on first line, time on second when multiple scans fall on the same day. */
function ScoreTrendXAxisTick({
  x,
  y,
  payload,
  scansPerDay,
}: {
  x: number | string;
  y: number | string;
  payload: { value?: number };
  scansPerDay: Record<string, number>;
}) {
  const nx = Number(x);
  const ny = Number(y);
  const ts = payload.value;
  if (ts == null || Number.isNaN(ts)) return null;
  const d = new Date(ts);
  const dayKey = dayKeyFromTs(ts);
  const showTime = (scansPerDay[dayKey] ?? 0) > 1;
  const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);

  const textStyle = {
    fontFamily: axisFont,
    fontFeatureSettings: '"tnum"',
  } as const;

  if (showTime) {
    return (
      <g transform={`translate(${nx},${ny})`}>
        <text
          textAnchor="middle"
          fill="#374151"
          fontSize={11}
          fontWeight={600}
          dy={10}
          style={textStyle}
        >
          {dateStr}
        </text>
        <text
          textAnchor="middle"
          fill="#6b7280"
          fontSize={10}
          fontWeight={500}
          letterSpacing="0.02em"
          dy={24}
          style={textStyle}
        >
          {timeStr}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${nx},${ny})`}>
      <text
        textAnchor="middle"
        fill="#374151"
        fontSize={11}
        fontWeight={600}
        letterSpacing="0.01em"
        dy={12}
        style={textStyle}
      >
        {dateStr}
      </text>
    </g>
  );
}

function ScoreTrendYAxisTick({
  x,
  y,
  payload,
}: {
  x: number | string;
  y: number | string;
  payload: { value?: number };
}) {
  const v = payload.value;
  if (v == null) return null;
  return (
    <g transform={`translate(${Number(x)},${Number(y)})`}>
      <text
        textAnchor="end"
        fill="#6b7280"
        fontSize={10}
        fontWeight={500}
        dx={-6}
        dy={4}
        style={{ fontFamily: axisFont, fontFeatureSettings: '"tnum"' }}
      >
        {Math.round(v)}
      </text>
    </g>
  );
}

function ScoreTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: number;
    payload?: { fullDate?: string };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const value = payload[0]?.value;
  if (typeof value !== 'number') return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-lg">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">When</p>
      <p className="mt-1 text-[13px] font-medium leading-snug text-gray-900 tabular-nums">
        {row?.fullDate ?? '—'}
      </p>
      <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Score</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums tracking-tight text-[#25c972]">{Math.round(value)}</span>
        <span className="text-[13px] font-medium tabular-nums text-gray-500">/ 100</span>
      </p>
    </div>
  );
}

function getTrendScore(scan: RecentScanData): number | null {
  return scan.scores?.overall ?? scan.score ?? null;
}

function getScanTimestamp(scan: RecentScanData): number {
  return scan.completedAt ?? scan.createdAt;
}

function svgDefId(reactId: string, suffix: string): string {
  return `${suffix}-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
  const chartDefsId = useId();
  const lineGradId = svgDefId(chartDefsId, 'scoreTrendLine');
  const areaGradId = svgDefId(chartDefsId, 'scoreTrendArea');

  const domainScans = recentScans
    .filter((scan) => getDomain(scan.url) === domain)
    .map((scan) => ({
      scan,
      timestamp: getScanTimestamp(scan),
      score: getTrendScore(scan),
    }))
    .filter((entry): entry is { scan: RecentScanData; timestamp: number; score: number } => entry.score != null)
    .sort((a, b) => a.timestamp - b.timestamp);

  const scansPerDay = domainScans.reduce<Record<string, number>>((acc, entry) => {
    const dayKey = new Date(entry.timestamp).toISOString().slice(0, 10);
    acc[dayKey] = (acc[dayKey] ?? 0) + 1;
    return acc;
  }, {});

  const chartData = domainScans.map((entry) => ({
    timestamp: entry.timestamp,
    score: entry.score,
    fullDate: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(entry.timestamp),
  }));

  const lastScan = domainScans[domainScans.length - 1]?.scan ?? null;
  const displayedLastScannedAt = lastScannedAt ?? (lastScan ? getScanTimestamp(lastScan) : null);
  const prevScan = domainScans.length >= 2 ? domainScans[domainScans.length - 2]?.scan ?? null : null;
  const scoreDelta =
    lastScan && prevScan && getTrendScore(lastScan) != null && getTrendScore(prevScan) != null
      ? Math.round((getTrendScore(lastScan) ?? 0) - (getTrendScore(prevScan) ?? 0))
      : null;

  const trendSpanDays =
    chartData.length < 2
      ? 0
      : (chartData[chartData.length - 1].timestamp - chartData[0].timestamp) / 86_400_000;

  return (
    <DashboardPanel id="monitoring" className="scroll-mt-6 p-4">
      <SectionTitle eyebrow="Monitoring" title="Score Trends" description="Track how your AI visibility score changes over time." />

      <div className="mt-3">
        {chartData.length >= 2 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={chartData}
                margin={{ left: 6, right: 10, top: 20, bottom: 6 }}
              >
                <defs>
                  <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1daf64" />
                    <stop offset="100%" stopColor="#3ee89b" />
                  </linearGradient>
                  <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#25c972" stopOpacity={0.2} />
                    <stop offset="55%" stopColor="#25c972" stopOpacity={0.06} />
                    <stop offset="100%" stopColor="#25c972" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 6"
                  stroke="rgba(0,0,0,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={trendSpanDays > 14 ? 32 : 44}
                  tick={(props) => (
                    <ScoreTrendXAxisTick {...props} scansPerDay={scansPerDay} />
                  )}
                  height={56}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 25, 50, 75, 100]}
                  width={38}
                  tick={ScoreTrendYAxisTick}
                  label={{
                    value: 'Score',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    style: {
                      fill: '#6b7280',
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontFamily: axisFont,
                    },
                  }}
                />
                <Tooltip
                  content={<ScoreTrendTooltip />}
                  cursor={{ stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1 }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="none"
                  fill={`url(#${areaGradId})`}
                  isAnimationActive={false}
                />
                {chartData.map((row) => (
                  <ReferenceLine
                    key={row.timestamp}
                    x={row.timestamp}
                    stroke="rgba(0,0,0,0.06)"
                    strokeDasharray="3 6"
                    strokeWidth={1}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={`url(#${lineGradId})`}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={{ fill: '#3ee89b', stroke: '#ffffff', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 7, fill: '#3ee89b', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : chartData.length === 1 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-6 py-8 text-center">
            <p className={cn('text-3xl font-bold', scoreColor(chartData[0].score))}>
              {Math.round(chartData[0].score)}
            </p>
            <p className="text-[13px] text-gray-600">Single data point on {formatShortDate(getScanTimestamp(lastScan!))}</p>
            <p className="text-[12px] text-gray-500">Run more scans to track trends over time.</p>
          </div>
        ) : (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-6 py-8 text-center text-[13px] text-gray-500">
            No score history yet. Run a scan to start tracking.
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
        <span>Last scanned: {displayedLastScannedAt ? formatRelativeTime(displayedLastScannedAt) : '--'}</span>
        {scoreDelta !== null && (
          <span className={scoreDelta >= 0 ? 'text-[#25c972]' : 'text-[#ff5252]'}>
            {scoreDelta >= 0 ? '+' : ''}{scoreDelta} since previous
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className={cn('inline-block h-2 w-2 rounded-full', monitoringConnected ? 'bg-[#25c972]' : 'bg-gray-400')} />
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
