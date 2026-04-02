'use client';

import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon, GrokIcon } from '@/components/ui/ai-icons';
import { AI_ENGINE_META } from '@/lib/ai-engines';
import { cn } from '@/lib/utils';

const ENGINE_DISPLAY: Record<string, { label: string; color: string; Icon?: React.ComponentType<{ className?: string }> }> = {
  chatgpt:    { label: 'ChatGPT',    color: AI_ENGINE_META.chatgpt.color,    Icon: ChatGPTIcon },
  perplexity: { label: 'Perplexity', color: AI_ENGINE_META.perplexity.color, Icon: PerplexityIcon },
  gemini:     { label: 'Gemini',     color: AI_ENGINE_META.gemini.color,     Icon: GeminiIcon },
  claude:     { label: 'Claude',     color: AI_ENGINE_META.claude.color,     Icon: ClaudeIcon },
  grok:       { label: 'Grok',       color: AI_ENGINE_META.grok.color,       Icon: GrokIcon },
};

interface PlatformCard {
  engine: string;
  mentioned: number;
  total: number;
  pct: number;
  status: string;
}

interface PlatformBreakdownProps {
  platformCards: PlatformCard[];
  compact?: boolean;
}

export function PlatformBreakdown({ platformCards, compact }: PlatformBreakdownProps) {
  const sorted = [...platformCards].sort((a, b) => b.pct - a.pct);

  return (
    <DashboardPanel className={compact ? 'p-4' : 'p-6'}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600">
        AI Platform Breakdown
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500">Mention rate by platform</p>

      {sorted.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-200 p-6 text-center">
          <p className="text-xs text-gray-500">Run a scan with AI mentions to see platform breakdown.</p>
        </div>
      ) : (
        <div className={compact ? 'mt-3 space-y-2' : 'mt-5 space-y-3'}>
          {sorted.map((pc) => {
            const key = pc.engine.toLowerCase();
            const display = ENGINE_DISPLAY[key] ?? { label: pc.engine, color: '#6b7280' };
            const Icon = display.Icon;
            return (
              <div key={pc.engine} className="flex items-center gap-2.5">
                <div className="flex w-[90px] shrink-0 items-center gap-1.5">
                  {Icon ? (
                    <span style={{ color: display.color }}>
                      <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                    </span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: display.color }} />
                  )}
                  <span className="text-[11px] font-medium text-gray-700">{display.label}</span>
                </div>
                <div className={cn('flex-1 rounded-full bg-gray-100', compact ? 'h-1.5' : 'h-2')}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(pc.pct, 2)}%`, backgroundColor: display.color }}
                  />
                </div>
                <span className={cn(
                  'w-[38px] text-right font-bold tabular-nums',
                  compact ? 'text-[12px]' : 'text-[13px]',
                  pc.pct >= 60 ? 'text-[#25c972]' : pc.pct >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]'
                )}>
                  {pc.pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );
}
