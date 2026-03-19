'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Copy, Check, Zap } from 'lucide-react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import type { PrioritizedFix } from '@/types/score';

interface QuickWinsSectionProps {
  fixes: PrioritizedFix[];
}

export function QuickWinsSection({ fixes }: QuickWinsSectionProps) {
  const topFixes = fixes.slice(0, 3);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (topFixes.length === 0) return null;

  const handleCopy = (fix: PrioritizedFix, idx: number) => {
    void navigator.clipboard.writeText(fix.copyPrompt || fix.instruction);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <DashboardPanel className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#ffbb00]" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Quick Wins</p>
          </div>
          <p className="mt-1 text-[13px] text-zinc-500">Highest-impact fixes you can do today</p>
        </div>
        <Link
          href="/report"
          className="mt-1 flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white"
        >
          View all {fixes.length} fixes <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {topFixes.map((fix, i) => (
          <div
            key={fix.checkId}
            className="group flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-3 transition-colors hover:border-white/10 hover:bg-white/[0.03]"
          >
            <span className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
              i === 0 ? 'bg-[#ffbb00]/15 text-[#ffbb00]' : 'bg-white/[0.06] text-zinc-400'
            )}>
              {i + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[12px] font-medium text-zinc-200">{fix.label}</p>
                <span className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                  fix.category === 'ai'
                    ? 'bg-[#a855f7]/15 text-[#a855f7]'
                    : 'bg-[#3b82f6]/15 text-[#3b82f6]'
                )}>
                  {fix.category === 'ai' ? 'AI' : 'Web'}
                </span>
              </div>
            </div>

            <span className="shrink-0 text-[11px] font-semibold text-[#25c972]">
              +{fix.estimatedLift} pts
            </span>

            <span className={cn(
              'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold',
              fix.effortBand === 'quick'
                ? 'bg-[#25c972]/10 text-[#25c972]'
                : fix.effortBand === 'medium'
                  ? 'bg-[#ffbb00]/10 text-[#ffbb00]'
                  : 'bg-[#ff8a1e]/10 text-[#ff8a1e]'
            )}>
              {fix.effortBand.charAt(0).toUpperCase() + fix.effortBand.slice(1)}
            </span>

            <button
              type="button"
              onClick={() => handleCopy(fix, i)}
              className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-all hover:text-zinc-300 group-hover:opacity-100"
              aria-label="Copy fix"
            >
              {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-[#25c972]" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}
