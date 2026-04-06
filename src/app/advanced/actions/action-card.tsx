'use client';

import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy, Bot, Globe, Zap, Clock, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionChecklistItem } from '@/types/action-checklist';

interface ActionCardProps {
  item: ActionChecklistItem;
  onToggle: (checkId: string, newStatus: 'done' | 'pending') => void;
  index?: number;
}

const EFFORT_CONFIG = {
  quick: { label: 'Quick win', icon: Zap, color: 'text-[#25c972]', bg: 'bg-[#25c972]/10', border: 'border-[#25c972]/20' },
  medium: { label: 'Medium', icon: Clock, color: 'text-[#ffbb00]', bg: 'bg-[#ffbb00]/10', border: 'border-[#ffbb00]/20' },
  technical: { label: 'Technical', icon: Wrench, color: 'text-[#ff8a1e]', bg: 'bg-[#ff8a1e]/10', border: 'border-[#ff8a1e]/20' },
} as const;

const LEFT_ACCENT = {
  quick: 'bg-[#25c972]',
  medium: 'bg-[#ffbb00]',
  technical: 'bg-[#ff8a1e]',
} as const;

export function ActionCard({ item, onToggle, index }: ActionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!item.copyPrompt) return;
    void navigator.clipboard.writeText(item.copyPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scanVerified = item.scanStatus === 'pass';
  const isDone = item.isComplete && !item.isRegression;
  const effort = item.effortBand ? EFFORT_CONFIG[item.effortBand] : null;
  const accentColor = item.effortBand ? LEFT_ACCENT[item.effortBand] : 'bg-zinc-600';
  const isAI = item.category === 'ai';

  return (
    <div
      className={cn(
        'group relative flex items-center gap-4 overflow-hidden rounded-2xl border py-4 pr-5 transition-all',
        isDone ? 'pl-5' : 'pl-[18px]',
        item.isRegression
          ? 'border-[#ffbb00]/25 bg-[#ffbb00]/[0.04]'
          : isDone
            ? 'border-white/5 bg-white/[0.01] opacity-50'
            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]',
      )}
    >
      {/* Left accent bar — flush with card edge, uses border-radius from overflow-hidden */}
      {!isDone && (
        <div className={cn('absolute inset-y-0 left-0 w-[3px]', accentColor)} />
      )}

      {/* Step number or checkbox */}
      <div className="shrink-0">
        {scanVerified ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25c972]/15">
            <CheckCircle2 className="h-4.5 w-4.5 text-[#25c972]" />
          </div>
        ) : item.isRegression ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffbb00]/15" title="Regression: latest scan found this still failing">
            <AlertTriangle className="h-4.5 w-4.5 text-[#ffbb00]" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              onToggle(item.checkId, item.manualStatus === 'done' ? 'pending' : 'done')
            }
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
              item.manualStatus === 'done'
                ? 'border-[#25c972] bg-[#25c972]/15'
                : 'border-zinc-600 bg-white/[0.02] hover:border-zinc-400 hover:bg-white/[0.05]',
            )}
          >
            {item.manualStatus === 'done' ? (
              <Check className="h-3.5 w-3.5 text-[#25c972]" />
            ) : index !== undefined ? (
              <span className="text-[11px] font-bold tabular-nums text-zinc-500">{index}</span>
            ) : null}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn(
            'text-[14px] font-semibold leading-snug',
            isDone ? 'text-zinc-500 line-through' : 'text-white',
          )}>
            {item.label}
          </p>
        </div>
        {item.detail && (
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-500 line-clamp-2">
            {item.detail}
          </p>
        )}

        {/* Tags row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {item.category && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                isAI
                  ? 'bg-[#a855f7]/12 text-[#c084fc]'
                  : 'bg-[#3b82f6]/12 text-[#60a5fa]',
              )}
            >
              {isAI ? <Bot className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {isAI ? 'AI Visibility' : 'Web Health'}
            </span>
          )}
          {effort && !isDone && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                effort.bg, effort.color,
              )}
            >
              <effort.icon className="h-3 w-3" />
              {effort.label}
            </span>
          )}
          {item.isRegression && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ffbb00]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#ffbb00]">
              <AlertTriangle className="h-3 w-3" />
              Needs re-fix
            </span>
          )}
        </div>
      </div>

      {/* Right side: points + copy */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {item.estimatedLift > 0 && !isDone && (
          <span className="rounded-full bg-[#25c972]/10 px-3 py-1 text-[12px] font-bold tabular-nums text-[#25c972]">
            +{item.estimatedLift} pts
          </span>
        )}
        {item.copyPrompt && (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all',
              copied
                ? 'bg-[#25c972]/10 text-[#25c972]'
                : 'text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300 opacity-0 group-hover:opacity-100',
            )}
            aria-label="Copy fix prompt"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy fix
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
