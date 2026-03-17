'use client';

import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { BOT_COLORS, BOT_CATEGORY_LABEL } from '../lib/constants';
import type { CrawlerSummary } from '../lib/types';

export function AICrawlerPanel({ domain }: { domain: string }) {
  const [summaries, setSummaries] = useState<CrawlerSummary[]>([]);
  const [timeline, setTimeline] = useState<Array<Record<string, unknown>>>([]);
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
          setSummaries(data.summaries ?? []);
          setTimeline(data.timeline ?? []);
          setTotalVisits(data.totalVisits ?? 0);
        }
      } catch { /* silently fail */ } finally { setLoading(false); }
    })();
  }, [domain, days]);

  if (loading || (summaries.length === 0 && totalVisits === 0)) return null;

  const allBots = [...new Set(summaries.map((s) => s.botName))];
  const chartData = timeline.map((row) => ({
    ...row,
    week: typeof row.week === 'string' ? (row.week as string).slice(5) : row.week,
  }));

  return (
    <DashboardPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle eyebrow="AI Crawlers" title="AI Crawler Traffic" description={`${totalVisits} AI bot visit${totalVisits === 1 ? '' : 's'} detected in the last ${days} days.`} />
        <div className="flex gap-1 mt-1">
          {[30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={cn('px-2.5 py-1 text-[10px] font-medium rounded transition-colors', days === d ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}>{d}d</button>
          ))}
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="mt-5 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={{ stroke: '#27272a' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={{ stroke: '#27272a' }} tickLine={false} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#a1a1aa' }} />
              {allBots.map((bot) => (
                <Line key={bot} type="monotone" dataKey={bot} stroke={BOT_COLORS[bot] ?? '#71717a'} strokeWidth={2} dot={{ r: 2 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-5 space-y-1.5">
        {summaries.map((s) => (
          <div key={s.botName} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: BOT_COLORS[s.botName] ?? '#71717a' }} />
              <div>
                <p className="text-[12px] font-medium text-zinc-200">{s.botName}</p>
                <p className="text-[9px] uppercase tracking-wider text-zinc-600">{BOT_CATEGORY_LABEL[s.botCategory] ?? s.botCategory}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div><p className="text-[11px] font-semibold tabular-nums text-zinc-300">{s.visitCount}</p><p className="text-[9px] text-zinc-600">visits</p></div>
              <div><p className="text-[11px] font-semibold tabular-nums text-zinc-300">{s.uniquePaths}</p><p className="text-[9px] text-zinc-600">pages</p></div>
            </div>
          </div>
        ))}
      </div>

      {summaries.length === 0 && (
        <p className="mt-5 text-center text-[12px] text-zinc-500">No AI crawler visits detected yet. Visits will appear here once AI bots discover your site.</p>
      )}
    </DashboardPanel>
  );
}
