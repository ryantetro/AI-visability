'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OptimizeTabGuide } from '@/app/optimize/components/optimize-tab-guide';
import { LockedFeatureOverlay } from '@/components/ui/locked-feature-overlay';
import type { SourceEcosystemAnalysis } from '@/lib/optimize/types';

type Payload = SourceEcosystemAnalysis & {
  limited: boolean;
};

function Segment({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-white">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function SourcesPanel({ domain }: { domain: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLocked(false);

      try {
        const response = await fetch(`/api/optimize/sources?domain=${encodeURIComponent(domain)}`, {
          cache: 'no-store',
        });

        if (response.status === 403) {
          if (!cancelled) {
            setLocked(true);
            setData(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load sources');
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

  if (locked) {
    return (
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/8 bg-white/[0.03]">
        <div className="space-y-4 p-6 opacity-25 blur-[1px]">
          <div className="h-6 w-48 rounded-full bg-white/10" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-24 rounded-[1.2rem] bg-white/8" />
            <div className="h-24 rounded-[1.2rem] bg-white/8" />
            <div className="h-24 rounded-[1.2rem] bg-white/8" />
          </div>
          <div className="h-44 rounded-[1.2rem] bg-white/8" />
        </div>
        <LockedFeatureOverlay
          featureName="Source Ecosystem"
          requiredTier="starter"
          variant="inline"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[1.4rem] border border-red-500/20 bg-red-500/8 p-6 text-sm text-red-200">
        Unable to load source ecosystem analysis right now.
      </div>
    );
  }

  return (
    <section className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Source Ecosystem
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Where AI engines pull citations from</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-500">
            Who gets cited when models answer about you—use it for PR and partnership targets.
          </p>
        </div>

        <div className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] font-medium text-zinc-300">
          {data.sourcesCount} unique sources
        </div>
      </div>

      <OptimizeTabGuide
        className="mt-5"
        summary="How to use this tab"
        steps={[
          'If “Own site” is thin, prioritize pages and mentions that earn citations.',
          'Top domains show who AI trusts—pitch or place content there when it fits.',
          'Gap rows are outreach ideas; pair with Actions if you use the checklist.',
        ]}
      />

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
          <Segment label="Own site" value={data.breakdown.ownSitePct} color="#25c972" />
        </div>
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
          <Segment label="Competitors" value={data.breakdown.competitorPct} color="#f59e0b" />
        </div>
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
          <Segment label="Third party" value={data.breakdown.thirdPartyPct} color="#60a5fa" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Top cited domains</h3>
            {data.limited && (
              <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-zinc-400">
                Starter view: top 10 only
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {data.topSources.map((source) => (
              <div
                key={source.domain}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{source.domain}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                    {source.category.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{source.citations}</p>
                  <p className="text-[11px] text-zinc-500">citations</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{source.sharePct}%</p>
                  <p className="text-[11px] text-zinc-500">share</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
          <h3 className="text-sm font-semibold text-white">Gap analysis</h3>
          <div className="mt-4 space-y-3">
            {data.gaps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
                {data.limited
                  ? 'Upgrade to Pro to unlock competitor-gap recommendations.'
                  : 'No clear third-party source gaps found from the latest competitor citation data.'}
              </div>
            ) : (
              data.gaps.slice(0, 6).map((gap) => (
                <div
                  key={gap.domain}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{gap.domain}</p>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-zinc-400">
                      {gap.competitorCitations} competitor citations
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{gap.recommendation}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
