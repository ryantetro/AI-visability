'use client';

import { useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneratedFile } from '../lib/types';
import type { PrioritizedFix } from '@/types/score';

const EFFORT_BADGE: Record<string, { label: string; className: string }> = {
  quick: { label: 'Quick Win', className: 'bg-emerald-500/15 text-emerald-300' },
  medium: { label: 'Medium', className: 'bg-yellow-500/15 text-yellow-300' },
  technical: { label: 'Technical', className: 'bg-blue-500/15 text-blue-300' },
};

function urgencyBorderColor(urgency: number): string {
  if (urgency >= 4) return '#ff8a1e';
  if (urgency === 3) return '#ffbb00';
  return '#3b82f6';
}

function metricDotColor(value: number | null): string {
  if (value == null) return 'bg-zinc-600';
  if (value >= 7) return 'bg-emerald-400';
  if (value >= 4) return 'bg-yellow-400';
  return 'bg-red-400';
}

export function FixCard({
  copied,
  file,
  fix,
  index,
  onCopyPrompt,
}: {
  copied: boolean;
  file: GeneratedFile | null;
  fix: PrioritizedFix;
  index: number;
  onCopyPrompt: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const effort = EFFORT_BADGE[fix.effortBand] ?? EFFORT_BADGE.medium;

  return (
    <div
      className="rounded-[1.15rem] border border-white/8 bg-white/[0.02] overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: urgencyBorderColor(fix.urgency) }}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[12px] font-semibold text-white">
          {index}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate">{fix.label}</h3>
            <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', effort.className)}>
              {effort.label}
            </span>
          </div>
        </div>

        {/* Inline metric dots */}
        <div className="hidden sm:flex items-center gap-3 shrink-0 mr-1">
          <MetricDot label="Impact" value={fix.estimatedLift} />
          <MetricDot label="Effort" value={fix.effort} />
          <MetricDot label="ROI" value={Math.round(fix.roi * 10)} />
        </div>

        <ChevronDown className={cn('h-4 w-4 shrink-0 text-zinc-500 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Body — collapsed by default */}
      {open && (
        <div className="border-t border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-transparent">
          <div className="space-y-0 px-4 pb-5 pt-4 pl-10 sm:pl-11">
            {/* Summary — reads as context, not a second card */}
            <p className="text-[13px] font-medium leading-relaxed text-zinc-400">{fix.detail}</p>

            {/* Single instruction surface: one ring, no nested card stack */}
            <div className="mt-5 rounded-xl ring-1 ring-inset ring-white/[0.08] bg-white/[0.02] px-4 py-4 sm:px-5 sm:py-[18px]">
              <div className="flex items-center gap-2">
                <span className="h-px flex-1 max-w-8 bg-gradient-to-r from-transparent to-white/15" aria-hidden />
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  How to fix it
                </span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" aria-hidden />
              </div>
              <p className="mt-3.5 text-[14px] font-medium leading-relaxed text-zinc-100">{fix.instruction}</p>

              {(fix.actualValue || fix.expectedValue) && (
                <div className="mt-5 grid gap-px overflow-hidden rounded-lg bg-white/[0.1] sm:grid-cols-2">
                  {fix.actualValue ? (
                    <FixValueCell label="Current" variant="current" text={fix.actualValue} />
                  ) : null}
                  {fix.expectedValue ? (
                    <FixValueCell label="Target" variant="target" text={fix.expectedValue} />
                  ) : null}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onCopyPrompt}
              className={cn(
                'mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-medium transition-all sm:w-auto sm:justify-start',
                copied
                  ? 'border-[#25c972]/25 bg-[#25c972]/10 text-[#86efac]'
                  : 'border-white/12 bg-white/[0.06] text-zinc-100 shadow-[0_1px_0_rgba(255,255,255,0.04)] hover:border-white/18 hover:bg-white/[0.09] active:scale-[0.99]',
              )}
            >
              <Copy className="h-3.5 w-3.5 opacity-80" />
              {copied ? 'Copied to clipboard' : file ? `Copy ${file.filename} prompt` : 'Copy fix prompt'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Inline metric dot ─────────────────────────────────────────────────── */

function MetricDot({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', metricDotColor(value))} />
      <span className="text-[10px] text-zinc-500">{label}</span>
    </div>
  );
}

function FixValueCell({
  label,
  variant,
  text,
}: {
  label: string;
  variant: 'current' | 'target';
  text: string;
}) {
  return (
    <div
      className={cn(
        'min-h-[4.5rem] space-y-2 p-4',
        variant === 'current'
          ? 'bg-[#09090b]/95'
          : 'bg-[#0c0c0f]/95',
      )}
    >
      <span
        className={cn(
          'inline-flex text-[10px] font-semibold uppercase tracking-[0.16em]',
          variant === 'current' ? 'text-amber-400/90' : 'text-emerald-400/90',
        )}
      >
        {label}
      </span>
      <p className="text-[12px] leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}
