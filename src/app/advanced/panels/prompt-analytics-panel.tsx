'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  Bar, BarChart, Cell,
} from 'recharts';
import { Lock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { usePlan } from '@/hooks/use-plan';
import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';
import { ENGINE_COLORS } from '../lib/constants';
import { EngineIcon } from './shared';
import type { AIEngine } from '@/types/ai-mentions';

interface TrendPoint {
  week: string;
  engine: AIEngine;
  avgPosition: number | null;
  mentionRate: number;
  totalChecks: number;
}

interface WeekChartRow {
  week: string;
  label: string;
  [engine: string]: string | number;
}

export function PromptAnalyticsPanel({ domain }: { domain: string }) {
  const { tier } = usePlan();
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundRunQueued, setBackgroundRunQueued] = useState(false);
  const autoRefreshAttemptsRef = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasAccess = tier !== 'free';

  useEffect(() => {
    if (!hasAccess) { setLoading(false); return; }

    let cancelled = false;
    autoRefreshAttemptsRef.current = 0;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/prompts/trends?domain=${encodeURIComponent(domain)}`);
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        const nextTrends = Array.isArray(data.trends) ? data.trends : [];
        const queued = Boolean(data.backgroundRunQueued);

        setTrends(nextTrends);
        setBackgroundRunQueued(queued);

        if (nextTrends.length > 0) {
          autoRefreshAttemptsRef.current = 0;
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }
        } else if (queued && autoRefreshAttemptsRef.current < 3) {
          const delay = autoRefreshAttemptsRef.current === 0 ? 3000 : 6000;
          autoRefreshAttemptsRef.current += 1;
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
          }
          refreshTimerRef.current = setTimeout(() => {
            void load();
          }, delay);
        }
      } catch {
        /* silently fail */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [domain, hasAccess]);

  if (!hasAccess) {
    return (
      <DashboardPanel className="p-6">
        <SectionTitle
          eyebrow="Analytics"
          title="Prompt Performance Trends"
          description="Track how your AI mention rate evolves week over week across engines."
        />
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12">
          <Lock className="h-8 w-8 text-gray-500" />
          <p className="mt-3 text-sm font-medium text-gray-600">Upgrade to Starter to unlock prompt analytics</p>
          <p className="mt-1 text-[12px] text-gray-500">See weekly mention rates, engine comparisons, and trend analysis.</p>
        </div>
      </DashboardPanel>
    );
  }

  if (loading) {
    return (
      <DashboardPanel className="p-6">
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-400" />
            <p className="text-xs text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </DashboardPanel>
    );
  }

  if (trends.length === 0) {
    return (
      <DashboardPanel className="p-6">
        <SectionTitle
          eyebrow="Analytics"
          title="Prompt Performance Trends"
          description="Track how your AI mention rate evolves week over week across engines."
        />
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            {backgroundRunQueued ? 'Running your initial prompt tests now.' : 'No prompt results yet.'}
          </p>
          <p className="mt-1 text-[12px] text-gray-500">
            {backgroundRunQueued
              ? 'We queued a background run across your enabled AI engines and will refresh this chart automatically.'
              : 'Add prompts and the platform will begin testing them across AI engines.'}
          </p>
        </div>
      </DashboardPanel>
    );
  }

  // ── Compute derived data ─────────────────────────────────────

  // Active engines (those with data)
  const activeEngines = AI_ENGINES.filter(e => trends.some(t => t.engine === e));

  // Build chart data: one row per week with mention rate columns per engine
  const weekMap = new Map<string, WeekChartRow>();
  for (const t of trends) {
    if (!weekMap.has(t.week)) {
      const d = new Date(t.week + 'T00:00:00Z');
      const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const day = d.getUTCDate();
      weekMap.set(t.week, { week: t.week, label: `${month} ${day}` });
    }
    weekMap.get(t.week)![t.engine] = t.mentionRate;
  }
  const chartData = Array.from(weekMap.values()).sort((a, b) => a.week.localeCompare(b.week));

  // Summary KPIs
  const totalChecks = trends.reduce((sum, t) => sum + t.totalChecks, 0);
  const totalMentioned = trends.reduce((sum, t) => sum + Math.round((t.mentionRate / 100) * t.totalChecks), 0);
  const overallRate = totalChecks > 0 ? Math.round((totalMentioned / totalChecks) * 100) : 0;

  // Per-engine aggregate
  const engineStats = activeEngines.map(engine => {
    const points = trends.filter(t => t.engine === engine);
    const checks = points.reduce((s, p) => s + p.totalChecks, 0);
    const mentioned = points.reduce((s, p) => s + Math.round((p.mentionRate / 100) * p.totalChecks), 0);
    const rate = checks > 0 ? Math.round((mentioned / checks) * 100) : 0;

    // Trend: compare last 2 weeks
    const sorted = [...points].sort((a, b) => a.week.localeCompare(b.week));
    const last = sorted[sorted.length - 1]?.mentionRate ?? 0;
    const prev = sorted[sorted.length - 2]?.mentionRate ?? last;
    const delta = last - prev;

    return { engine, checks, mentioned, rate, delta };
  }).sort((a, b) => b.rate - a.rate);

  const bestEngine = engineStats[0];

  // Weekly trend direction (most recent vs previous)
  const weeks = chartData.map(r => r.week).sort();
  const lastWeek = weeks[weeks.length - 1];
  const prevWeek = weeks[weeks.length - 2];
  const lastWeekPoints = trends.filter(t => t.week === lastWeek);
  const prevWeekPoints = prevWeek ? trends.filter(t => t.week === prevWeek) : [];
  const lastWeekRate = lastWeekPoints.length > 0
    ? Math.round(lastWeekPoints.reduce((s, t) => s + t.mentionRate, 0) / lastWeekPoints.length)
    : 0;
  const prevWeekRate = prevWeekPoints.length > 0
    ? Math.round(prevWeekPoints.reduce((s, t) => s + t.mentionRate, 0) / prevWeekPoints.length)
    : lastWeekRate;
  const weeklyDelta = lastWeekRate - prevWeekRate;

  // Bar chart data for engine comparison
  const barData = engineStats.map(e => ({
    name: getAIEngineLabel(e.engine),
    engine: e.engine,
    rate: e.rate,
  }));

  return (
    <DashboardPanel className="p-6">
      <SectionTitle
        eyebrow="Analytics"
        title="Prompt Performance Trends"
        description={`${totalChecks} prompt checks across ${activeEngines.length} engine${activeEngines.length === 1 ? '' : 's'} over ${chartData.length} week${chartData.length === 1 ? '' : 's'}.`}
      />

      {/* KPI Summary */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Total Checks</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalChecks.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Mention Rate</p>
          <p className={cn('mt-1 text-2xl font-bold', overallRate >= 50 ? 'text-[#25c972]' : overallRate >= 25 ? 'text-[#ffbb00]' : 'text-[#ff5252]')}>
            {overallRate}%
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Best Engine</p>
          <div className="mt-1 flex items-center gap-2">
            {bestEngine && (
              <>
                <EngineIcon engine={bestEngine.engine} className="size-5" style={{ color: ENGINE_COLORS[bestEngine.engine] ?? '#71717a' }} />
                <span className="text-lg font-bold text-gray-900">{bestEngine.rate}%</span>
              </>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Weekly Trend</p>
          <div className="mt-1 flex items-center gap-1.5">
            {weeklyDelta > 0 ? (
              <TrendingUp className="h-5 w-5 text-[#25c972]" />
            ) : weeklyDelta < 0 ? (
              <TrendingDown className="h-5 w-5 text-[#ff5252]" />
            ) : (
              <Minus className="h-5 w-5 text-gray-500" />
            )}
            <span className={cn(
              'text-2xl font-bold',
              weeklyDelta > 0 ? 'text-[#25c972]' : weeklyDelta < 0 ? 'text-[#ff5252]' : 'text-gray-600',
            )}>
              {weeklyDelta > 0 ? '+' : ''}{weeklyDelta}%
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Mention Rate Trend Chart */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Mention Rate Over Time</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.08)' }} />
                {activeEngines.map(engine => (
                  <Line
                    key={engine}
                    type="monotone"
                    dataKey={engine}
                    stroke={ENGINE_COLORS[engine] ?? '#71717a'}
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#ffffff', stroke: ENGINE_COLORS[engine] ?? '#71717a', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: ENGINE_COLORS[engine] ?? '#71717a', stroke: '#ffffff', strokeWidth: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-1 flex items-center justify-center gap-5">
            {activeEngines.map(engine => (
              <div key={engine} className="flex items-center gap-2">
                <EngineIcon engine={engine} className="size-4" style={{ color: ENGINE_COLORS[engine] ?? '#71717a' }} />
                <span className="text-[11px] font-medium text-gray-600">{getAIEngineLabel(engine)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Engine Comparison Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Engine Comparison</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={85} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as { name: string; engine: string; rate: number };
                    return (
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                        <span className="font-medium text-gray-700">{item.name}</span>
                        <span className="ml-2 font-bold text-gray-900">{item.rate}%</span>
                      </div>
                    );
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={20}>
                  {barData.map(entry => (
                    <Cell key={entry.engine} fill={ENGINE_COLORS[entry.engine] ?? '#71717a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-engine trend indicators */}
          <div className="mt-3 space-y-2">
            {engineStats.slice(0, 4).map(e => (
              <div key={e.engine} className="flex items-center gap-2">
                <EngineIcon engine={e.engine} className="size-3.5" style={{ color: ENGINE_COLORS[e.engine] ?? '#71717a' }} />
                <span className="flex-1 text-[11px] text-gray-600">{getAIEngineLabel(e.engine)}</span>
                <span className="text-[11px] font-medium text-gray-700">{e.rate}%</span>
                {e.delta !== 0 && (
                  <span className={cn('text-[10px] font-medium', e.delta > 0 ? 'text-[#25c972]' : 'text-[#ff5252]')}>
                    {e.delta > 0 ? '+' : ''}{e.delta}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}

/* ── Custom Tooltip ─────────────────────────────────────────── */

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-gray-600 mb-1.5">Week of {label}</p>
      {payload
        .filter(p => p.value != null)
        .sort((a, b) => b.value - a.value)
        .map(p => (
          <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
            <EngineIcon engine={p.dataKey} className="size-3.5" style={{ color: ENGINE_COLORS[p.dataKey] ?? '#71717a' }} />
            <span className="text-[11px] text-gray-700">{getAIEngineLabel(p.dataKey as AIEngine)}</span>
            <span className="ml-auto text-[11px] font-semibold tabular-nums text-gray-900">{p.value}%</span>
          </div>
        ))
      }
    </div>
  );
}
