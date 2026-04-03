'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Copy, Check, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrioritizedFix } from '@/types/score';

interface QuickWinsSectionProps {
  fixes: PrioritizedFix[];
  compact?: boolean;
  limit?: number;
}

export function QuickWinsSection({ fixes, compact, limit = 5 }: QuickWinsSectionProps) {
  const topFixes = fixes.slice(0, limit);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (topFixes.length === 0) return null;

  const handleCopy = (fix: PrioritizedFix, idx: number) => {
    void navigator.clipboard.writeText(fix.copyPrompt || fix.instruction);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const totalLift = topFixes.reduce((sum, f) => sum + f.estimatedLift, 0);

  return (
    <div id="fixes-section" className={cn('rounded-2xl border border-gray-200 bg-white shadow-sm', compact ? 'p-4' : 'p-6')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={cn('flex shrink-0 items-center justify-center rounded-lg bg-amber-100', compact ? 'h-6 w-6' : 'h-7 w-7')}>
            <Zap className={cn('text-amber-600', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          </div>
          <div>
            <h2 className={cn('font-bold text-gray-900', compact ? 'text-[13px]' : 'text-base')}>Quick Wins</h2>
            <p className="text-[10px] text-gray-600">
              Up to <span className="font-semibold text-green-700">+{totalLift} pts</span> lift
            </p>
          </div>
        </div>
        <Link
          href="/report"
          className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-700 hover:text-gray-900"
        >
          All {fixes.length} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className={cn(compact ? 'mt-3 space-y-1.5' : 'mt-4 space-y-2')}>
        {topFixes.map((fix, i) => (
          <div
            key={fix.checkId}
            className={cn(
              'group flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 transition-colors hover:border-gray-200 hover:bg-gray-50',
              compact ? 'px-3 py-2' : 'px-4 py-3'
            )}
          >
            <span className={cn(
              'mt-0.5 flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
              compact ? 'h-5 w-5' : 'h-6 w-6',
              i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'
            )}>
              {i + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className={cn('font-medium text-gray-800', compact ? 'text-[12px]' : 'text-sm')}>{fix.label}</p>
                <span className={cn(
                  'shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase',
                  fix.category === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                )}>
                  {fix.category === 'ai' ? 'AI' : 'Web'}
                </span>
              </div>
              {!compact && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-700">{fix.instruction}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-[11px] font-semibold text-green-600">+{fix.estimatedLift}</span>
              <button
                type="button"
                onClick={() => handleCopy(fix, i)}
                className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all hover:text-gray-800 group-hover:opacity-100"
                aria-label="Copy fix instructions"
              >
                {copiedIdx === i ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Want these fixes done for you?</p>
            <p className="text-xs text-gray-700">Our experts implement optimizations within 48 hours</p>
          </div>
          <Link
            href="/report#fix-my-site"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
          >
            Fix My Site <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
