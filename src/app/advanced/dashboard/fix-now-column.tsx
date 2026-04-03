'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Copy, Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/hooks/use-onboarding';
import type { PrioritizedFix } from '@/types/score';

interface FixNowColumnProps {
  fixes: PrioritizedFix[];
}

export function FixNowColumn({ fixes }: FixNowColumnProps) {
  const { steps, allComplete, dismissed } = useOnboarding();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const showOnboarding = !allComplete && !dismissed;

  const handleCopy = (fix: PrioritizedFix, idx: number) => {
    void navigator.clipboard.writeText(fix.copyPrompt || fix.instruction);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const topFixes = fixes.slice(0, 3);

  return (
    <div className="flex-1 rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-[#ffbb00]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Fix Now</p>
      </div>

      <div className="mt-3 space-y-2">
        {showOnboarding ? (
          /* New users: show onboarding steps as action items */
          steps.filter((s) => !s.completed).slice(0, 3).map((step, i) => (
            <Link
              key={step.key}
              href={step.href}
              className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.03]"
            >
              <span className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                i === 0 ? 'bg-[#ffbb00]/15 text-[#ffbb00]' : 'bg-white/[0.06] text-zinc-400'
              )}>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-200">
                {step.label}
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 text-zinc-600" />
            </Link>
          ))
        ) : topFixes.length > 0 ? (
          /* Returning users: top 3 fixes */
          topFixes.map((fix, i) => (
            <div
              key={fix.checkId}
              className="group flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.03]"
            >
              <span className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                i === 0 ? 'bg-[#ffbb00]/15 text-[#ffbb00]' : 'bg-white/[0.06] text-zinc-400'
              )}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[12px] font-medium text-zinc-200">{fix.label}</p>
                  <span className={cn(
                    'shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase',
                    fix.category === 'ai'
                      ? 'bg-[#a855f7]/15 text-[#a855f7]'
                      : 'bg-[#3b82f6]/15 text-[#3b82f6]'
                  )}>
                    {fix.category === 'ai' ? 'AI' : 'Web'}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-[#25c972]">
                +{fix.estimatedLift}pts
              </span>
              <span className={cn(
                'shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold',
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
                {copiedIdx === i ? <Check className="h-3 w-3 text-[#25c972]" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-[12px] text-zinc-600">No fixes needed right now</p>
        )}
      </div>

      {!showOnboarding && fixes.length > 3 && (
        <Link
          href="/report"
          className="mt-3 flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white"
        >
          View all {fixes.length} fixes <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
