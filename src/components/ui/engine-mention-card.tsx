'use client';

import { cn } from '@/lib/utils';
import type { AIEngine, EngineBreakdown, MentionEngineStatus } from '@/types/ai-mentions';
import { getAIEngineLabel } from '@/lib/ai-engines';

const SENTIMENT_LABELS: Record<EngineBreakdown['sentiment'], { text: string; color: string }> = {
  positive: { text: 'Positive', color: 'text-emerald-400' },
  neutral: { text: 'Neutral', color: 'text-amber-400' },
  negative: { text: 'Negative', color: 'text-red-400' },
  'not-found': { text: 'Not found', color: 'text-zinc-500' },
};

interface EngineMentionCardProps {
  engine: AIEngine;
  breakdown: EngineBreakdown;
  status?: MentionEngineStatus;
}

export function EngineMentionCard({ engine, breakdown, status }: EngineMentionCardProps) {
  const label = getAIEngineLabel(engine);
  const sentimentInfo = SENTIMENT_LABELS[breakdown.sentiment];
  const ratio = breakdown.total > 0 ? breakdown.mentioned / breakdown.total : 0;
  const barWidth = Math.round(ratio * 100);
  const statusText = status?.status === 'not_backfilled'
    ? 'Not tested on this scan yet'
    : status?.status === 'not_configured'
      ? 'Not configured on this run'
      : status?.status === 'error'
        ? 'Engine test error'
        : sentimentInfo.text;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <h4 className="text-[13px] font-semibold text-white">{label}</h4>
      <p className="mt-1 text-[20px] font-bold tabular-nums text-white">
        {Math.round(ratio * 100)}
        <span className="text-[13px] font-normal text-zinc-500">%</span>
        <span className="ml-1.5 text-[13px] font-normal text-zinc-500">mention rate</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            ratio >= 0.6 ? 'bg-emerald-500' : ratio >= 0.3 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${Math.max(barWidth, 4)}%` }}
        />
      </div>
      <p className={cn('mt-2 flex items-center gap-1.5 text-[11px]', sentimentInfo.color)}>
        <span className={cn(
          'h-1.5 w-1.5 rounded-full',
          (status?.status === 'not_backfilled' || status?.status === 'not_configured')
            ? 'bg-zinc-500'
            : status?.status === 'error'
              ? 'bg-red-500'
              : sentimentInfo.color.replace('text-', 'bg-')
        )} />
        {statusText}
      </p>
    </div>
  );
}
