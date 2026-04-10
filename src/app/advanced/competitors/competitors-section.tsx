'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import type { CompetitorData } from '../lib/types';

export function CompetitorsSection({ domain }: { domain: string }) {
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'appearances' | 'avgPosition'>('appearances');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCompetitors([]);
    (async () => {
      try {
        const res = await fetch(`/api/competitors?domain=${encodeURIComponent(domain)}`);
        if (res.ok) {
          const data = await res.json();
          if (active) setCompetitors(data.competitors ?? []);
        }
      } catch { /* silently fail */ } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [domain]);

  const sorted = [...competitors].sort((a, b) => {
    const aVal = sortBy === 'appearances' ? a.appearances : (a.avgPosition ?? 999);
    const bVal = sortBy === 'appearances' ? b.appearances : (b.avgPosition ?? 999);
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const totalCompetitors = competitors.length;
  const avgShareOfVoice = competitors.length > 0
    ? Math.round(competitors.reduce((acc, c) => acc + c.appearances, 0) / competitors.length)
    : 0;
  const topCompetitor = sorted[0]?.competitor ?? '--';

  const handleSort = (col: 'appearances' | 'avgPosition') => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500">
        Loading competitor data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardPanel className="p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Total Competitors</p>
          <p className="mt-2 text-3xl font-bold text-white">{totalCompetitors}</p>
        </DashboardPanel>
        <DashboardPanel className="p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Avg Appearances</p>
          <p className="mt-2 text-3xl font-bold text-[#ff8a1e]">{avgShareOfVoice}</p>
        </DashboardPanel>
        <DashboardPanel className="p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Top Competitor</p>
          <p className="mt-2 truncate text-lg font-bold text-white">{topCompetitor}</p>
        </DashboardPanel>
      </div>

      {/* Competitor Rankings Table */}
      <DashboardPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle
            eyebrow="Rankings"
            title="Competitor Rankings"
            description="All competitors detected in AI engine responses."
          />
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
          >
            <Plus className="h-3 w-3" />
            Add Competitor
          </button>
        </div>

        {sorted.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th
                    className="cursor-pointer pb-2 pr-4 font-medium hover:text-zinc-300"
                    onClick={() => handleSort('appearances')}
                  >
                    Mentions {sortBy === 'appearances' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="cursor-pointer pb-2 pr-4 font-medium hover:text-zinc-300"
                    onClick={() => handleSort('avgPosition')}
                  >
                    Avg Position {sortBy === 'avgPosition' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="pb-2 font-medium">Engines</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.competitor} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="max-w-[200px] truncate py-3 pr-4 font-medium text-zinc-200">{c.competitor}</td>
                    <td className="py-3 pr-4 tabular-nums text-zinc-300">{c.appearances}</td>
                    <td className="py-3 pr-4 tabular-nums text-zinc-300">
                      {c.avgPosition != null ? c.avgPosition : '--'}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.engines.map((e) => (
                          <span key={e} className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] capitalize text-zinc-400">
                            {e}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-zinc-500">
            No competitors detected yet. Run more scans to discover competitors in AI answers.
          </p>
        )}
      </DashboardPanel>
    </div>
  );
}
