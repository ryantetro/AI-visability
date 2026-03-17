'use client';

import { cn } from '@/lib/utils';
import { scoreColor } from '../lib/utils';

export function CenteredLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

export function CenteredWorkspaceState({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div className={cn(
      'flex min-h-[180px] items-center justify-center rounded-[1.2rem] border px-6 py-10 text-center text-sm',
      tone === 'error'
        ? 'border-red-500/20 bg-red-500/8 text-red-300'
        : 'border-white/8 bg-white/[0.02] text-zinc-400'
    )}>
      {label}
    </div>
  );
}

export function MetricPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold', scoreColor(value))}>{value == null ? '--' : `${Math.round(value)}`}</p>
    </div>
  );
}

export function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-white">{Math.round(payload[0].value)}%</p>
    </div>
  );
}
