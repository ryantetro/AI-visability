'use client';

import { cn } from '@/lib/utils';
import type { MentionPrompt, MentionResult } from '@/types/ai-mentions';
import { getAIEngineLabel } from '@/lib/ai-engines';

interface MentionPromptCheckProps {
  prompt: MentionPrompt;
  results: MentionResult[];
}

export function MentionPromptCheck({ prompt, results }: MentionPromptCheckProps) {
  const mentionedCount = results.filter((r) => r.mentioned).length;
  const totalEngines = results.length;
  const majority = mentionedCount > totalEngines / 2;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        majority
          ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
          : 'border-red-500/30 bg-red-500/[0.04]'
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
            majority ? 'bg-emerald-500' : 'bg-red-500'
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-white">&ldquo;{prompt.text}&rdquo;</p>
          <p className="mt-1 text-[11px] text-zinc-400">
            {totalEngines > 0
              ? `${Math.round((mentionedCount / totalEngines) * 100)}% of AI engines surfaced a mention`
              : 'No engine results'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {results.map((r) => (
              <span
                key={r.engine}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                  r.mentioned
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-zinc-500/10 text-zinc-500'
                )}
              >
                {r.mentioned ? '✓' : '✗'} {getAIEngineLabel(r.engine)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
