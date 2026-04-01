'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { OptimizeTabGuide } from '@/app/optimize/components/optimize-tab-guide';
import type { ContentOpportunity } from '@/lib/optimize/types';

type Payload = {
  opportunities: ContentOpportunity[];
  usage: {
    briefsUsed: number;
    briefsLimit: number;
    draftsUsed: number;
    draftsLimit: number;
  };
};

function formatTypeLabel(value: ContentOpportunity['contentType']) {
  return value.replace(/_/g, ' ');
}

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
        <p className="text-sm font-semibold text-white">
          {limit > 0 ? `${used} / ${limit}` : 'Locked'}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#25c972] to-[#8de4b2]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ContentOpportunitiesPanel({ domain }: { domain: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/optimize/content/opportunities?domain=${encodeURIComponent(domain)}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load opportunities');
        }

        const payload = await response.json();
        if (!cancelled) {
          setData(payload as Payload);
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[1.4rem] border border-white/8 bg-white/[0.03]">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[1.4rem] border border-red-500/20 bg-red-500/8 p-6 text-sm text-red-200">
        Unable to load content opportunities right now.
      </div>
    );
  }

  return (
    <section className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Content Studio
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Where to publish or rewrite first</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-500">
            Ranked gaps: where you are missing or weak in AI answers. Pick what to ship on your site next.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[#25c972]/20 bg-[#25c972]/10 px-3 py-1.5 text-[12px] font-medium text-[#9af1be]">
          <Sparkles className="h-3.5 w-3.5" />
          {data.opportunities.length} ranked opportunities
        </div>
      </div>

      <OptimizeTabGuide
        className="mt-5"
        summary="How to use this tab"
        steps={[
          'Work down from #1—that row is the biggest gap right now.',
          'Publish or refresh a page that directly answers that prompt.',
          'Come back after new monitoring to see what moved to the top.',
        ]}
      />

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <UsageMeter
          label="Briefs / outlines this month"
          used={data.usage.briefsUsed}
          limit={data.usage.briefsLimit}
        />
        <UsageMeter
          label="Drafts this month"
          used={data.usage.draftsUsed}
          limit={data.usage.draftsLimit}
        />
      </div>

      <div className="mt-5 space-y-3">
        {data.opportunities.length === 0 ? (
          <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-5 text-sm text-zinc-400">
            No content gaps are standing out yet. Track a few more prompts or wait for fresh monitoring results to surface clearer opportunities.
          </div>
        ) : (
          data.opportunities.slice(0, 8).map((opportunity, index) => (
            <article
              key={opportunity.promptId}
              className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      #{index + 1}
                    </span>
                    <span className="rounded-full border border-[#25c972]/20 bg-[#25c972]/10 px-2.5 py-1 text-[11px] font-medium text-[#9af1be]">
                      {formatTypeLabel(opportunity.contentType)}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                      {opportunity.category}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-white">{opportunity.promptText}</h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    {opportunity.reason}. Competitors showing up here: {opportunity.competitorNames.length > 0 ? opportunity.competitorNames.join(', ') : 'none identified yet'}.
                  </p>
                </div>

                <div className="min-w-[180px] space-y-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Missing engines</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {opportunity.missingEngines.length > 0 ? opportunity.missingEngines.map((engine) => (
                        <span
                          key={engine}
                          className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-200"
                        >
                          {engine}
                        </span>
                      )) : (
                        <span className="text-xs text-zinc-500">None</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Weak engines</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {opportunity.weakEngines.length > 0 ? opportunity.weakEngines.map((engine) => (
                        <span
                          key={engine}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-zinc-300"
                        >
                          {engine}
                        </span>
                      )) : (
                        <span className="text-xs text-zinc-500">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

    </section>
  );
}
