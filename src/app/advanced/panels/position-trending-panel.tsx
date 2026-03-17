'use client';

import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { ENGINE_COLORS } from '../lib/constants';
import type { TrendPoint } from '../lib/types';

export function PositionTrendingPanel({ domain }: { domain: string }) {
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/prompts/trends?domain=${encodeURIComponent(domain)}`);
        if (res.ok) { const data = await res.json(); setTrends(data.trends ?? []); }
      } catch { /* silently fail */ } finally { setLoading(false); }
    })();
  }, [domain]);

  if (loading || trends.length === 0) return null;

  const engines = [...new Set(trends.map((t) => t.engine))];
  const weeks = [...new Set(trends.map((t) => t.week))].sort();

  const chartData = weeks.map((week) => {
    const row: Record<string, unknown> = { week: week.slice(5) };
    for (const engine of engines) {
      const point = trends.find((t) => t.week === week && t.engine === engine);
      row[engine] = point?.avgPosition ?? null;
    }
    return row;
  });

  const hasPositionData = trends.some((t) => t.avgPosition !== null);
  if (!hasPositionData) return null;

  return (
    <DashboardPanel className="p-5">
      <SectionTitle eyebrow="Position Tracking" title="AI Position Trends" description="Average position in AI-ranked lists per engine over time. Lower is better." />

      <div className="mt-5 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={{ stroke: '#27272a' }} tickLine={false} />
            <YAxis reversed domain={[1, 'auto']} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={{ stroke: '#27272a' }} tickLine={false} label={{ value: 'Position', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#52525b' } }} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#a1a1aa' }} />
            {engines.map((engine) => (
              <Line key={engine} type="monotone" dataKey={engine} stroke={ENGINE_COLORS[engine] ?? '#71717a'} strokeWidth={2} dot={{ r: 3 }} connectNulls name={engine.charAt(0).toUpperCase() + engine.slice(1)} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-4">
        {engines.map((engine) => (
          <div key={engine} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: ENGINE_COLORS[engine] ?? '#71717a' }} />
            <span className="text-[10px] capitalize text-zinc-500">{engine}</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Weekly mention rate</p>
        <div className="flex flex-wrap gap-2">
          {engines.map((engine) => {
            const engineTrends = trends.filter((t) => t.engine === engine);
            if (engineTrends.length === 0) return null;
            const latest = engineTrends[engineTrends.length - 1];
            const earliest = engineTrends[0];
            const delta = latest && earliest ? latest.mentionRate - earliest.mentionRate : 0;
            return (
              <div key={engine} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-center">
                <p className="text-[10px] capitalize text-zinc-500">{engine}</p>
                <p className="text-sm font-bold tabular-nums text-zinc-200">{latest?.mentionRate ?? 0}%</p>
                {delta !== 0 && <p className={cn('text-[9px] tabular-nums', delta > 0 ? 'text-[#25c972]' : 'text-[#ff5252]')}>{delta > 0 ? '+' : ''}{delta}%</p>}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardPanel>
  );
}
