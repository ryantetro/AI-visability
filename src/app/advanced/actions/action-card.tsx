'use client';

import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionChecklistItem } from '@/types/action-checklist';

interface ActionCardProps {
  item: ActionChecklistItem;
  onToggle: (checkId: string, newStatus: 'done' | 'pending') => void;
}

export function ActionCard({ item, onToggle }: ActionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!item.copyPrompt) return;
    void navigator.clipboard.writeText(item.copyPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scanVerified = item.scanStatus === 'pass';
  const isDone = item.isComplete && !item.isRegression;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
        item.isRegression
          ? 'border-[#ffbb00]/20 bg-[#ffbb00]/[0.03]'
          : isDone
            ? 'border-white/5 bg-white/[0.01] opacity-60'
            : 'border-white/8 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.035]',
      )}
    >
      {/* Checkbox / status icon */}
      <div className="mt-0.5 shrink-0">
        {scanVerified ? (
          <CheckCircle2 className="h-5 w-5 text-[#25c972]" />
        ) : item.isRegression ? (
          <div className="relative" title="Regression: latest scan found this still failing">
            <AlertTriangle className="h-5 w-5 text-[#ffbb00]" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              onToggle(item.checkId, item.manualStatus === 'done' ? 'pending' : 'done')
            }
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors',
              item.manualStatus === 'done'
                ? 'border-[#25c972] bg-[#25c972]/20'
                : 'border-zinc-600 hover:border-zinc-400',
            )}
          >
            {item.manualStatus === 'done' && (
              <Check className="h-3 w-3 text-[#25c972]" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-[13px] font-medium',
          isDone ? 'text-zinc-500 line-through' : 'text-zinc-200',
        )}>
          {item.label}
        </p>
        {item.detail && (
          <p className="mt-0.5 text-[11px] text-zinc-500 line-clamp-2">
            {item.detail}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {item.category && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                item.category === 'ai'
                  ? 'bg-[#a855f7]/15 text-[#a855f7]'
                  : 'bg-[#3b82f6]/15 text-[#3b82f6]',
              )}
            >
              {item.category === 'ai' ? 'AI' : 'Web'}
            </span>
          )}
          {item.effortBand && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                item.effortBand === 'quick'
                  ? 'bg-[#25c972]/10 text-[#25c972]'
                  : item.effortBand === 'medium'
                    ? 'bg-[#ffbb00]/10 text-[#ffbb00]'
                    : 'bg-[#ff8a1e]/10 text-[#ff8a1e]',
              )}
            >
              {item.effortBand.charAt(0).toUpperCase() + item.effortBand.slice(1)}
            </span>
          )}
          {item.isRegression && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-[#ffbb00]/10 text-[#ffbb00]">
              Regression
            </span>
          )}
        </div>
      </div>

      {/* Right side: points + copy */}
      <div className="flex shrink-0 items-center gap-2">
        {item.estimatedLift > 0 && !isDone && (
          <span className="text-[11px] font-semibold text-[#25c972]">
            +{item.estimatedLift}pts
          </span>
        )}
        {item.copyPrompt && (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1 text-zinc-600 opacity-0 transition-all hover:text-zinc-300 group-hover:opacity-100"
            aria-label="Copy fix prompt"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#25c972]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
