'use client';

import { useState } from 'react';
import { Check, ChevronDown, Copy, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrioritizedFix } from '@/types/score';
import type { ContentGap } from '../lib/types';
import { barFillColor } from '../lib/utils';

interface ImproveActionCenterProps {
  topFixes: PrioritizedFix[];
  totalFixCount: number;
  gaps: ContentGap[];
  gapsLoading: boolean;
  onCopyFixPrompt: (fix: PrioritizedFix) => Promise<void>;
  onScrollToFixList: () => void;
}

export function ImproveActionCenter({
  topFixes,
  totalFixCount,
  gaps,
  gapsLoading,
  onCopyFixPrompt,
  onScrollToFixList,
}: ImproveActionCenterProps) {
  const [copiedFixIdx, setCopiedFixIdx] = useState<number | null>(null);
  const [gapsExpanded, setGapsExpanded] = useState(false);

  const topGaps = gaps.slice(0, 3);
  const showAllGaps = gapsExpanded ? gaps : topGaps;

  const handleCopy = async (fix: PrioritizedFix, idx: number) => {
    await onCopyFixPrompt(fix);
    setCopiedFixIdx(idx);
    setTimeout(() => setCopiedFixIdx(null), 2000);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Fix Now */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-[#ffbb00]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Fix now</p>
        </div>
        <p className="mt-1 text-[12px] text-zinc-600">Top fixes sorted by ROI</p>

        <div className="mt-4 space-y-2">
          {topFixes.length === 0 ? (
            <p className="rounded-lg border border-white/5 bg-white/[0.015] px-3 py-4 text-center text-[12px] text-zinc-500">
              No fixes needed — you&apos;re in great shape.
            </p>
          ) : (
            topFixes.map((fix, i) => {
              const effortLabel =
                fix.effortBand === 'quick' ? 'Quick Win' : fix.effortBand === 'technical' ? 'Technical' : 'Medium';
              const impactPct = Math.min(100, Math.round((fix.estimatedLift / 20) * 100));
              return (
                <div
                  key={fix.checkId}
                  className="group flex flex-col gap-2 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.03] sm:flex-row sm:items-center"
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      i === 0 ? 'bg-[#ffbb00]/15 text-[#ffbb00]' : 'bg-white/[0.06] text-zinc-400',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-zinc-200">{fix.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                          fix.effortBand === 'quick'
                            ? 'bg-[#25c972]/10 text-[#25c972]'
                            : fix.effortBand === 'technical'
                              ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                              : 'bg-[#ffbb00]/10 text-[#ffbb00]',
                        )}
                      >
                        {effortLabel}
                      </span>
                      <span className="text-[10px] font-semibold text-[#25c972]">+{fix.pointsAvailable} pts</span>
                    </div>
                    <div className="mt-2 h-1 max-w-[140px] rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${impactPct}%`,
                          backgroundColor: barFillColor(Math.min(100, fix.estimatedLift * 5)),
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy(fix, i)}
                    className="shrink-0 self-start rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] sm:self-center"
                  >
                    {copiedFixIdx === i ? (
                      <span className="inline-flex items-center gap-1 text-[#25c972]">
                        <Check className="h-3 w-3" /> Copied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Copy className="h-3 w-3" /> Copy prompt
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {totalFixCount > 3 && (
          <button
            type="button"
            onClick={onScrollToFixList}
            className="mt-3 w-full text-center text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            See all {totalFixCount} fixes below ↓
          </button>
        )}
      </div>

      {/* Content gaps */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-[#ff8a1e]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Content gaps</p>
        </div>
        <p className="mt-1 text-[12px] text-zinc-600">Prompts where AI rarely mentions your brand</p>

        <div className="mt-4 space-y-2">
          {gapsLoading ? (
            <p className="rounded-lg border border-white/5 px-3 py-4 text-center text-[12px] text-zinc-500">
              Loading gaps…
            </p>
          ) : gaps.length === 0 ? (
            <p className="rounded-lg border border-white/5 bg-white/[0.015] px-3 py-4 text-center text-[12px] text-zinc-500">
              No content gaps detected for your monitored prompts.
            </p>
          ) : (
            showAllGaps.map((gap, i) => (
              <div
                key={`${gap.promptText.slice(0, 40)}-${i}`}
                className="rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5"
              >
                <p className="line-clamp-2 text-[12px] font-medium text-zinc-200">&ldquo;{gap.promptText}&rdquo;</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      gap.mentionRate === 0 ? 'text-[#ff5252]' : 'text-[#ff8a1e]',
                    )}
                  >
                    {Math.round(gap.mentionRate * 100)}% mention rate
                  </span>
                  {gap.engines.length > 0 && (
                    <span className="text-zinc-600">
                      Missing in {gap.engines.length} engine{gap.engines.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {!gapsLoading && gaps.length > 3 && (
          <button
            type="button"
            onClick={() => setGapsExpanded((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {gapsExpanded ? 'Show fewer' : `View all ${gaps.length} gaps`}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', gapsExpanded && 'rotate-180')} />
          </button>
        )}

        {!gapsLoading && gaps.length > 0 && gapsExpanded && (
          <div className="mt-4 rounded-lg border border-[#6c63ff]/15 bg-[#6c63ff]/5 px-3 py-2.5">
            <p className="text-[11px] font-medium text-[#a78bfa]">Content strategy tip</p>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
              Create pages or FAQs that directly match these questions so AI engines can cite your brand.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
