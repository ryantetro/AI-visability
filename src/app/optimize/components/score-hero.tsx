'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaturityResult, MaturityStage } from '@/lib/optimize/types';

const STAGE_LABELS: Record<MaturityStage, string> = {
  1: 'Unaware',
  2: 'Emerging',
  3: 'Optimizing',
  4: 'Operationalized',
};

interface ScoreHeroProps {
  domain: string;
  actionsCompleted: number;
  actionsTotal: number;
  pointsAvailable: number;
}

export function ScoreHero({ domain, actionsCompleted, actionsTotal, pointsAvailable }: ScoreHeroProps) {
  const [maturity, setMaturity] = useState<MaturityResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/optimize/maturity?domain=${encodeURIComponent(domain)}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (!cancelled) setMaturity(data as MaturityResult);
      } catch {
        if (!cancelled) setMaturity(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [domain]);

  if (loading) {
    return (
      <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-br from-indigo-950/60 via-indigo-900/30 to-indigo-950/60">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!maturity) return null;

  const scorePct = (maturity.stage / 4) * 100;
  const nextStage = maturity.stage < 4 ? (maturity.stage + 1) as MaturityStage : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 via-[#1a1640] to-indigo-950/80 p-6 shadow-[0_0_60px_rgba(79,70,229,0.08)]">
      {/* Subtle glow effect */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        {/* Left: Score */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300/60">
            Your AEO Score
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-bold tabular-nums text-white">
              {maturity.stage}
            </span>
            <span className="text-2xl text-zinc-500">/4</span>
            {actionsCompleted > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                {actionsCompleted} done
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-72 max-w-full">
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>

          <p className="mt-2 text-[13px] text-zinc-400">
            Stage {maturity.stage}: <span className="text-zinc-200">{STAGE_LABELS[maturity.stage]}</span>
            {nextStage && (
              <>
                {' '}&rarr;{' '}
                <span className="text-amber-400">Stage {nextStage}: {STAGE_LABELS[nextStage]}</span>
              </>
            )}
          </p>
        </div>

        {/* Right: Actions summary */}
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Actions completed
          </p>
          <div className="mt-2 flex items-baseline justify-end gap-1">
            <span className="text-3xl font-bold tabular-nums text-white">{actionsCompleted}</span>
            <span className="text-lg text-zinc-500">of {actionsTotal}</span>
          </div>
          {pointsAvailable > 0 && (
            <p className="mt-1 text-[13px] text-emerald-400">
              {pointsAvailable} more actions available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
