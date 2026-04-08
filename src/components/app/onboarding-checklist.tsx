'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboarding, type OnboardingStep } from '@/hooks/use-onboarding';

const LS_COLLAPSED_KEY = 'aiso_onboarding_collapsed';

export function OnboardingChecklist() {
  const {
    steps,
    completedCount,
    totalSteps,
    progressPct,
    allComplete,
    dismissed,
    dismiss,
  } = useOnboarding();

  const [expanded, setExpanded] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_COLLAPSED_KEY);
    setExpanded(stored === '1' ? false : true);
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(LS_COLLAPSED_KEY, next ? '0' : '1');
      return next;
    });
  }, []);

  if (allComplete || dismissed || expanded === null) return null;

  const nextStep = steps.find((s) => !s.completed) ?? null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[240px]">
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#161618]/95 shadow-2xl shadow-black/50 backdrop-blur-sm">
        {/* Header */}
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-[13px] font-semibold text-white">
            Setup progress ({completedCount}/{totalSteps})
          </span>
          <div className="flex items-center gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded text-zinc-400">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); dismiss(); } }}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:text-zinc-300"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4">
            {/* Progress bar */}
            <div className="h-1 w-full rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[#356df4] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Steps */}
            <div className="mt-3 space-y-px">
              {steps.map((step) => (
                <StepRow key={step.key} step={step} isNext={step === nextStep} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepRow({ step, isNext }: { step: OnboardingStep; isNext: boolean }) {
  const inner = (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
        isNext ? 'bg-[#356df4]/[0.08]' : 'hover:bg-white/[0.02]',
      )}
    >
      <div className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        {step.completed ? (
          <div className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#25c972]">
            <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
          </div>
        ) : isNext ? (
          <div className="h-[16px] w-[16px] rounded-full border-2 border-[#356df4]" />
        ) : (
          <div className="h-[16px] w-[16px] rounded-full border-[1.5px] border-zinc-700" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-[12px] font-medium leading-[18px]',
            step.completed
              ? 'text-zinc-500 line-through decoration-zinc-700'
              : isNext ? 'text-white' : 'text-zinc-400',
          )}
        >
          {step.label}
        </span>
        {isNext && step.description && (
          <span className="mt-0.5 block text-[11px] leading-[1.35] text-zinc-500">
            {step.description}
          </span>
        )}
      </div>
    </div>
  );

  if (step.completed) return <div>{inner}</div>;

  return (
    <Link href={step.href} className="block">
      {inner}
    </Link>
  );
}
