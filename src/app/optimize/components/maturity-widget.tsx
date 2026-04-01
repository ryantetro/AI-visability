'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import type { MaturityCriterion, MaturityResult, OptimizeTabKey } from '@/lib/optimize/types';

const STAGES = [
  { value: 1, label: 'Unaware' },
  { value: 2, label: 'Auditing' },
  { value: 3, label: 'Optimizing' },
  { value: 4, label: 'Operationalized' },
] as const;

function getVisibleCriteria(stage: number, criteria: MaturityCriterion[]) {
  if (stage <= 1) {
    return criteria.filter((criterion) => criterion.stage === 2);
  }

  if (stage >= 4) {
    return criteria.filter((criterion) => criterion.stage === 4);
  }

  return criteria.filter((criterion) => {
    return (criterion.stage === stage && !criterion.met) || criterion.stage === stage + 1;
  });
}

export function MaturityWidget({
  domain,
  onTabChange,
}: {
  domain: string;
  onTabChange: (tab: OptimizeTabKey) => void;
}) {
  const [data, setData] = useState<MaturityResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/optimize/maturity?domain=${encodeURIComponent(domain)}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load maturity');
        }

        const payload = await response.json();
        if (!cancelled) {
          setData(payload as MaturityResult);
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
      <DashboardPanel className="flex min-h-[220px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </DashboardPanel>
    );
  }

  if (!data) {
    return (
      <DashboardPanel className="border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.12)_0%,rgba(6,6,7,0.98)_100%)] p-6">
        <p className="text-sm text-red-200">
          Unable to load maturity signals for this domain right now.
        </p>
      </DashboardPanel>
    );
  }

  const visibleCriteria = getVisibleCriteria(data.stage, data.criteria);

  return (
    <DashboardPanel className="overflow-hidden">
      <div className="border-b border-white/8 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">AEO Maturity</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{data.label}</h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-500">
              Auditing vs. running a steady program. Use Next milestones to jump to the right tab.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.018] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Prompts</p>
              <p className="mt-1 text-lg font-semibold text-white tabular-nums">{data.counts.prompts}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.018] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Platforms</p>
              <p className="mt-1 text-lg font-semibold text-white tabular-nums">{data.counts.platforms}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.018] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Content</p>
              <p className="mt-1 text-lg font-semibold text-white tabular-nums">{data.counts.content}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.018] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Completed</p>
              <p className="mt-1 text-lg font-semibold text-white tabular-nums">{data.counts.completedActions}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-center gap-2">
              {STAGES.map((stage, index) => (
                <div key={stage.value} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                      data.stage >= stage.value
                        ? 'border-[#25c972]/40 bg-[#25c972]/16 text-[#9af1be]'
                        : 'border-white/10 bg-white/[0.03] text-zinc-500',
                    )}
                  >
                    {stage.value}
                  </div>
                  {index < STAGES.length - 1 && (
                    <div className="h-px flex-1 bg-white/10">
                      <div
                        className="h-full bg-[#25c972] transition-all"
                        style={{ width: data.stage > stage.value ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-500 sm:grid-cols-4">
              {STAGES.map((stage) => (
                <div key={stage.value}>{stage.label}</div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.018] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Next Milestones
            </p>
            <div className="mt-3 space-y-2.5">
              {visibleCriteria.map((criterion) => (
                <button
                  key={criterion.key}
                  type="button"
                  disabled={criterion.met}
                  onClick={() => onTabChange(criterion.tab)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] transition-colors',
                    criterion.met
                      ? 'cursor-default border-[#25c972]/25 bg-[#25c972]/8 text-zinc-200'
                      : 'border-white/8 bg-white/[0.018] text-zinc-300 hover:border-white/12 hover:bg-white/[0.04]',
                  )}
                >
                  {criterion.met ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#25c972]" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                  )}
                  <span className="flex-1">{criterion.label}</span>
                  {!criterion.met && <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}
