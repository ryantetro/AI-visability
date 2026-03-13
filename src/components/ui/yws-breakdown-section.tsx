'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Copy, HelpCircle, Info, Lock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckItem {
  label: string;
  detail?: string;
  verdict?: 'pass' | 'fail' | 'unknown';
  points?: number;
  maxPoints?: number;
}

export interface SubSection {
  label: string;
  checks: CheckItem[];
}

interface YwsBreakdownSectionProps {
  title: string;
  score: number | null;
  maxScore?: number;
  scoreColor: string;
  onCopyToLlm?: () => void;
  copied?: boolean;
  passCount?: number;
  failCount?: number;
  unknownCount?: number;
  checks: CheckItem[];
  subSections?: SubSection[];
  defaultExpanded?: boolean;
  showClickHint?: boolean;
  /** When false, all checks show as Locked until upgrade. When true, show full check details. */
  hasPaid?: boolean;
}

export function YwsBreakdownSection({
  title,
  score,
  maxScore = 100,
  scoreColor,
  onCopyToLlm,
  copied = false,
  passCount = 0,
  failCount = 0,
  unknownCount = 0,
  checks,
  subSections,
  defaultExpanded = false,
  showClickHint = false,
  hasPaid = false,
}: YwsBreakdownSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const displayScore = score !== null ? score : 0;
  const sections = subSections ?? [{ label: '', checks }];

  return (
    <div className={cn('relative', showClickHint && 'pt-8')}>
      {showClickHint && (
        <div className="absolute right-0 top-0 z-10 flex items-center gap-1.5 text-[11px] font-normal text-zinc-400">
          <span>👇</span>
          Click to open / close
        </div>
      )}

      <section className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition-colors hover:bg-white/[0.02] sm:gap-8"
        >
          {/* Left: Title + Score */}
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-white">
              {title}{' '}
              <span style={{ color: scoreColor }} className="tabular-nums">{displayScore}</span>
              <span className="text-[13px] font-normal text-zinc-500 tabular-nums">/{maxScore}</span>
            </h3>
          </div>

          {/* Center: Copy to LLM + Indicators */}
          <div className="flex shrink-0 items-center gap-6 sm:gap-8">
            {onCopyToLlm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyToLlm();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy to LLM'}
              </button>
            )}
            <div className="flex items-center gap-5 text-[12px] text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {passCount}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {unknownCount}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {failCount}
              </span>
            </div>
          </div>

          {/* Right: Expand chevron */}
          <div className="flex shrink-0 pl-2">
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-500" />
            )}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-white/[0.06] px-6 py-5">
            {sections.map((section) => (
              <div key={section.label || 'main'} className={section.label ? 'mt-8 first:mt-0' : ''}>
                {section.label && (
                  <h4 className="mb-3 text-[13px] font-semibold text-white">{section.label}</h4>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.checks.map((check) => (
                    <CheckCard key={check.label} check={check} locked={!hasPaid} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CheckCard({ check, locked = false }: { check: CheckItem; locked?: boolean }) {
  const hasData = !locked && check.detail !== undefined && check.verdict !== undefined;

  if (hasData) {
    const verdictStyles = {
      pass: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', Icon: CheckCircle2 },
      fail: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', Icon: XCircle },
      unknown: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', Icon: HelpCircle },
    };
    const style = verdictStyles[check.verdict!];
    const Icon = style.Icon;

    return (
      <div
        className={cn(
          'flex items-start justify-between gap-3 rounded-lg border p-4',
          style.border,
          style.bg,
          'bg-white/[0.02]'
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4 shrink-0', style.text)} />
            <p className="font-medium text-white">{check.label}</p>
          </div>
          <p className="mt-1 text-xs text-zinc-400">{check.detail}</p>
          {check.points !== undefined && check.maxPoints !== undefined && (
            <p className="mt-1 text-[11px] text-zinc-500">
              {check.points}/{check.maxPoints} pts
            </p>
          )}
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase',
            style.text,
            style.bg
          )}
        >
          {check.verdict}
        </span>
      </div>
    );
  }

  /* Locked state - matches screenshot: bullet, title, info icon, upgrade text, Locked badge */
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-zinc-300">{check.label}</p>
            <Info className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Upgrade to unlock full details for this check.
          </p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-zinc-400">
        <Lock className="h-3.5 w-3.5" />
        Locked
      </span>
    </div>
  );
}
