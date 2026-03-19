'use client';

import { Bell } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { formatShortDate, formatRelativeTime, scoreColor } from '../lib/utils';
import { ChartTooltipContent } from './shared';
import type { RecentScanData } from '../lib/types';
import { getDomain } from '@/lib/url-utils';

function getTrendScore(scan: RecentScanData): number | null {
  return scan.scores?.overall ?? scan.score ?? null;
}

function getScanTimestamp(scan: RecentScanData): number {
  return scan.completedAt ?? scan.createdAt;
}

function formatTrendLabel(timestamp: number, includeTime: boolean): string {
  return new Intl.DateTimeFormat('en-US', includeTime
    ? {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    : {
        month: 'short',
        day: 'numeric',
      }).format(timestamp);
}

export function MonitoringTrendsPanel({
  recentScans,
  domain,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
}: {
  recentScans: RecentScanData[];
  domain: string;
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

  const scansPerDay = domainScans.reduce<Record<string, number>>((acc, entry) => {
    const dayKey = new Date(entry.timestamp).toISOString().slice(0, 10);
    acc[dayKey] = (acc[dayKey] ?? 0) + 1;
    return acc;
  }, {});

  const chartData = domainScans.map((entry) => {
    const dayKey = new Date(entry.timestamp).toISOString().slice(0, 10);
    const includeTime = (scansPerDay[dayKey] ?? 0) > 1;
    return {
      date: formatTrendLabel(entry.timestamp, includeTime),
      score: entry.score,
      fullDate: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(entry.timestamp),
    };
  });

  const lastScan = domainScans[domainScans.length - 1]?.scan ?? null;
  const prevScan = domainScans.length >= 2 ? domainScans[domainScans.length - 2]?.scan ?? null : null;
  const scoreDelta =
    lastScan && prevScan && getTrendScore(lastScan) != null && getTrendScore(prevScan) != null
      ? Math.round((getTrendScore(lastScan) ?? 0) - (getTrendScore(prevScan) ?? 0))
      : null;

  return (
    <DashboardPanel className="p-5">
      <SectionTitle eyebrow="Monitoring" title="Score Trends" description="Track how your AI visibility score changes over time." />

      <div className="mt-5">
        {chartData.length >= 2 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipContent />} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''} />
                <Line type="monotone" dataKey="score" stroke="#25c972" strokeWidth={2} dot={{ fill: '#25c972', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
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
        <span>Last scanned: {lastScan ? formatRelativeTime(lastScan.completedAt ?? lastScan.createdAt) : '--'}</span>
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
