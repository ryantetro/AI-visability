'use client';

import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import type { DashboardReportData } from '../lib/types';

export function CitationTrackingPanel({ report }: { report: DashboardReportData }) {
  const results = report.mentionSummary?.results;
  if (!results) return null;

  const allCitations = results.flatMap((r) =>
    (r.citationUrls ?? []).map((c) => ({ ...c, engine: r.engine }))
  );
  if (allCitations.length === 0) return null;

  const ownDomain = allCitations.filter((c) => c.isOwnDomain);
  const competitor = allCitations.filter((c) => c.isCompetitor && !c.isOwnDomain);
  const thirdParty = allCitations.filter((c) => !c.isOwnDomain && !c.isCompetitor);

  const domainCounts = new Map<string, { count: number; isOwn: boolean; isComp: boolean }>();
  for (const c of allCitations) {
    const existing = domainCounts.get(c.domain);
    if (existing) {
      existing.count++;
    } else {
      domainCounts.set(c.domain, { count: 1, isOwn: c.isOwnDomain, isComp: c.isCompetitor });
    }
  }
  const sortedDomains = Array.from(domainCounts.entries()).sort((a, b) => b[1].count - a[1].count);

  const engines = ['chatgpt', 'perplexity', 'gemini', 'claude'] as const;
  const engineCounts = engines
    .map((e) => ({ engine: e, count: allCitations.filter((c) => c.engine === e).length }))
    .filter((e) => e.count > 0);

  return (
    <DashboardPanel className="p-5">
      <SectionTitle
        eyebrow="Citations"
        title="AI Citation Sources"
        description={`${allCitations.length} citation URLs found across ${engineCounts.length} engine${engineCounts.length === 1 ? '' : 's'}`}
      />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#25c972]/15 bg-[#25c972]/5 px-3 py-3 text-center">
          <p className="text-lg font-bold text-[#25c972]">{ownDomain.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Your domain</p>
        </div>
        <div className="rounded-xl border border-[#ff8a1e]/15 bg-[#ff8a1e]/5 px-3 py-3 text-center">
          <p className="text-lg font-bold text-[#ff8a1e]">{competitor.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Competitor</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 text-center">
          <p className="text-lg font-bold text-zinc-300">{thirdParty.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Third-party</p>
        </div>
      </div>

      {engineCounts.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Citations by engine</p>
          <div className="flex flex-wrap gap-2">
            {engineCounts.map((ec) => (
              <span key={ec.engine} className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-zinc-300">
                <span className="font-semibold capitalize">{ec.engine}</span>
                <span className="text-zinc-500">{ec.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Cited domains</p>
        <div className="space-y-1.5">
          {sortedDomains.slice(0, 12).map(([domainName, info]) => (
            <div key={domainName} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'inline-block h-1.5 w-1.5 rounded-full',
                  info.isOwn ? 'bg-[#25c972]' : info.isComp ? 'bg-[#ff8a1e]' : 'bg-zinc-500'
                )} />
                <span className="text-[12px] text-zinc-200">{domainName}</span>
                {info.isOwn && <span className="text-[9px] uppercase tracking-wider text-[#25c972]/70">you</span>}
                {info.isComp && <span className="text-[9px] uppercase tracking-wider text-[#ff8a1e]/70">competitor</span>}
              </div>
              <span className="text-[11px] tabular-nums text-zinc-500">{info.count}x</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardPanel>
  );
}
