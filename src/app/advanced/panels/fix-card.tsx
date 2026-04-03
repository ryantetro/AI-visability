'use client';

import { useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';
import { MiniInfoTile } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import type { GeneratedFile } from '../lib/types';
import type { PrioritizedFix } from '@/types/score';

const EFFORT_BADGE: Record<string, { label: string; className: string }> = {
  quick: { label: 'Quick Win', className: 'bg-emerald-50 text-emerald-700' },
  medium: { label: 'Medium', className: 'bg-yellow-50 text-yellow-700' },
  technical: { label: 'Technical', className: 'bg-blue-50 text-blue-700' },
};

function urgencyBorderColor(urgency: number): string {
  if (urgency >= 4) return '#ff8a1e';
  if (urgency === 3) return '#ffbb00';
  return '#3b82f6';
}

function metricDotColor(value: number | null): string {
  if (value == null) return 'bg-gray-300';
  if (value >= 7) return 'bg-emerald-500';
  if (value >= 4) return 'bg-yellow-500';
  return 'bg-red-500';
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
      className="rounded-[1.15rem] border border-gray-200 bg-white overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: urgencyBorderColor(fix.urgency) }}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[12px] font-semibold text-gray-700">
          {index}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{fix.label}</h3>
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

        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Body — collapsed by default */}
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          <p className="text-sm leading-6 text-gray-600 pl-9">{fix.detail}</p>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 ml-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">How to fix it</p>
            <p className="mt-2 text-[13px] leading-6 text-gray-700">{fix.instruction}</p>
            {(fix.actualValue || fix.expectedValue) && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {fix.actualValue ? <MiniInfoTile title="Current value" body={fix.actualValue} /> : null}
                {fix.expectedValue ? <MiniInfoTile title="Expected value" body={fix.expectedValue} /> : null}
              </div>
            )}
          </div>

          <div className="ml-9">
            <button
              type="button"
              onClick={onCopyPrompt}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors',
                copied ? 'bg-blue-50 text-blue-700' : 'bg-[var(--color-primary)] text-white hover:opacity-90'
              )}
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Prompt copied' : file ? `Copy ${file.filename} prompt` : 'Copy fix prompt'}
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
      <span className="text-[10px] text-gray-600">{label}</span>
    </div>
  );
}
