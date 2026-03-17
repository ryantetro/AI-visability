'use client';

import { useEffect, useState } from 'react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import type { CompetitorData } from '../lib/types';

export function CompetitorSharePanel({ domain }: { domain: string }) {
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/competitors?domain=${encodeURIComponent(domain)}`);
        if (res.ok) { const data = await res.json(); setCompetitors(data.competitors ?? []); }
      } catch { /* silently fail */ } finally { setLoading(false); }
    })();
  }, [domain]);

  if (loading || competitors.length === 0) return null;

  const top = competitors.slice(0, 8);
  const maxAppearances = Math.max(...top.map((c) => c.appearances), 1);

  return (
    <DashboardPanel className="p-5">
      <SectionTitle
        eyebrow="Competitors"
        title="Competitor Share in AI Answers"
        description={`${competitors.length} competitor${competitors.length === 1 ? '' : 's'} detected across AI engine responses in the last 30 days.`}
      />
      <div className="mt-5 space-y-2">
        {top.map((c) => {
          const pct = Math.round((c.appearances / maxAppearances) * 100);
          return (
            <div key={c.competitor} className="rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-zinc-200 truncate max-w-[60%]">{c.competitor}</span>
                <div className="flex items-center gap-3">
                  {c.avgPosition !== null && <span className="text-[10px] text-zinc-500">avg pos {c.avgPosition}</span>}
                  <span className="text-[11px] font-semibold tabular-nums text-zinc-300">{c.appearances}x</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5">
                <div className="h-full rounded-full bg-[#ff8a1e] transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                {c.engines.map((e) => <span key={e} className="text-[9px] capitalize text-zinc-600">{e}</span>)}
                {c.coMentionedCount > 0 && <span className="ml-auto text-[9px] text-[#25c972]/70">co-mentioned {c.coMentionedCount}x</span>}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}
