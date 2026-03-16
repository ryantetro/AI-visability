'use client';

import { cn } from '@/lib/utils';
import type { AIEngine, EngineBreakdown } from '@/types/ai-mentions';

const ENGINE_LABELS: Record<AIEngine, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
};

const SENTIMENT_LABELS: Record<EngineBreakdown['sentiment'], { text: string; color: string }> = {
  positive: { text: 'Positive', color: 'text-emerald-400' },
  neutral: { text: 'Neutral', color: 'text-amber-400' },
  negative: { text: 'Negative', color: 'text-red-400' },
  'not-found': { text: 'Not found', color: 'text-zinc-500' },
};

interface EngineMentionCardProps {
  engine: AIEngine;
  breakdown: EngineBreakdown;
}

export function EngineMentionCard({ engine, breakdown }: EngineMentionCardProps) {
  const label = ENGINE_LABELS[engine];
  const sentimentInfo = SENTIMENT_LABELS[breakdown.sentiment];
  const ratio = breakdown.total > 0 ? breakdown.mentioned / breakdown.total : 0;
  const barWidth = Math.round(ratio * 100);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <h4 className="text-[13px] font-semibold text-white">{label}</h4>
      <p className="mt-1 text-[20px] font-bold tabular-nums text-white">
        {breakdown.mentioned}{' '}
        <span className="text-[13px] font-normal text-zinc-500">/ {breakdown.total}</span>
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
          sentimentInfo.color.replace('text-', 'bg-')
        )} />
        {sentimentInfo.text}
      </p>
    </div>
  );
}
