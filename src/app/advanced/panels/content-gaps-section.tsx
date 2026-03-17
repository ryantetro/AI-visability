'use client';

import { useEffect, useState } from 'react';
import { CollapsibleSection, DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import type { ContentGap } from '../lib/types';

export function ContentGapsSection({ domain }: { domain: string }) {
  const [gaps, setGaps] = useState<ContentGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/prompts?domain=${encodeURIComponent(domain)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const prompts: Array<{ id: string; promptText: string; category: string }> = data.prompts ?? [];
        const results: Array<{ promptId: string; engine: string; mentioned: boolean }> = data.results ?? [];

        const byPrompt = new Map<string, { mentioned: number; total: number; engines: Set<string> }>();
        for (const r of results) {
          const existing = byPrompt.get(r.promptId);
          if (existing) {
            existing.total++;
            if (r.mentioned) existing.mentioned++;
            existing.engines.add(r.engine);
          } else {
            byPrompt.set(r.promptId, { mentioned: r.mentioned ? 1 : 0, total: 1, engines: new Set([r.engine]) });
          }
        }

        const contentGaps: ContentGap[] = [];
        for (const p of prompts) {
          const stats = byPrompt.get(p.id);
          if (!stats || stats.total === 0) continue;
          const rate = stats.mentioned / stats.total;
          if (rate < 0.5) {
            const missingEngines = Array.from(stats.engines).filter((eng) => {
              const engResults = results.filter((r) => r.promptId === p.id && r.engine === eng);
              return engResults.every((r) => !r.mentioned);
            });
            contentGaps.push({ promptText: p.promptText, category: p.category, engines: missingEngines, totalChecks: stats.total, mentionRate: rate });
          }
        }

        contentGaps.sort((a, b) => a.mentionRate - b.mentionRate);
        if (!cancelled) setGaps(contentGaps);
      } catch { /* silently fail */ } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [domain]);

  if (loading || gaps.length === 0) return null;

  const critical = gaps.filter((g) => g.mentionRate === 0);
  const partial = gaps.filter((g) => g.mentionRate > 0);

  return (
    <CollapsibleSection title="Content Gaps" defaultOpen={false}>
      <DashboardPanel className="p-5">
        <SectionTitle eyebrow="Opportunities" title="Content gap analysis" description={`${gaps.length} prompt${gaps.length === 1 ? '' : 's'} where AI engines don't mention your brand`} />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#ff5252]/15 bg-[#ff5252]/5 px-3 py-3 text-center">
            <p className="text-lg font-bold text-[#ff5252]">{critical.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Never mentioned</p>
          </div>
          <div className="rounded-xl border border-[#ff8a1e]/15 bg-[#ff8a1e]/5 px-3 py-3 text-center">
            <p className="text-lg font-bold text-[#ff8a1e]">{partial.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Low mention rate</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {gaps.map((gap, i) => (
            <div key={i} className="rounded-[1.1rem] border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200 line-clamp-2">&ldquo;{gap.promptText}&rdquo;</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">{gap.category}</span>
                    {gap.engines.length > 0 && <span className="text-[10px] text-zinc-500">Missing in: {gap.engines.join(', ')}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('text-sm font-bold tabular-nums', gap.mentionRate === 0 ? 'text-[#ff5252]' : 'text-[#ff8a1e]')}>{Math.round(gap.mentionRate * 100)}%</p>
                  <p className="text-[9px] text-zinc-600">mention rate</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-[#6c63ff]/15 bg-[#6c63ff]/5 px-4 py-3">
          <p className="text-[12px] font-medium text-[#6c63ff]">Content strategy tip</p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
            Create dedicated pages or FAQ sections that directly address these prompts.
            AI engines are more likely to cite your brand when your content closely matches
            the questions users ask.
          </p>
        </div>
      </DashboardPanel>
    </CollapsibleSection>
  );
}
