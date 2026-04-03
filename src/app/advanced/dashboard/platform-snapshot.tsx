'use client';

import { cn } from '@/lib/utils';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon, GrokIcon } from '@/components/ui/ai-icons';
import { AI_ENGINE_META } from '@/lib/ai-engines';
import type { AIEngine } from '@/types/ai-mentions';

interface PlatformChip {
  engine: AIEngine;
  pct: number;
  status: string;
}

interface PlatformSnapshotProps {
  platformCards: PlatformChip[];
}

const ENGINE_ICONS: Partial<Record<AIEngine, React.ComponentType<{ className?: string }>>> = {
  chatgpt: ChatGPTIcon,
  perplexity: PerplexityIcon,
  gemini: GeminiIcon,
  claude: ClaudeIcon,
  grok: GrokIcon,
};

const ENGINE_LABELS: Record<AIEngine, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
  grok: 'Grok',
};

export function PlatformSnapshot({ platformCards }: PlatformSnapshotProps) {
  if (platformCards.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Platform Breakdown
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {platformCards.map((pc) => {
          const Icon = ENGINE_ICONS[pc.engine];
          const color = AI_ENGINE_META[pc.engine]?.color ?? '#6b7280';
          const isComplete = pc.status === 'complete';

          return (
            <div
              key={pc.engine}
              className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 transition-colors hover:bg-white/[0.04]"
            >
              {Icon ? (
                <span style={{ color }} className="flex items-center">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              )}
              <span className="text-[11px] font-medium text-zinc-300">
                {ENGINE_LABELS[pc.engine] ?? pc.engine}
              </span>
              {isComplete ? (
                <>
                  <span className={cn(
                    'text-[11px] font-bold tabular-nums',
                    pc.pct >= 60 ? 'text-[#25c972]' : pc.pct >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]'
                  )}>
                    {pc.pct}%
                  </span>
                  <div className="h-1 w-10 rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pc.pct}%`, backgroundColor: color }}
                    />
                  </div>
                </>
              ) : (
                <span className="text-[10px] text-zinc-600">--</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
