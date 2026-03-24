'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/hooks/use-onboarding';
import { DashboardPanel } from '@/components/app/dashboard-primitives';

export function OnboardingChecklist() {
  const { steps, completedCount, totalSteps, progressPct, allComplete, dismissed, dismiss } = useOnboarding();

  if (allComplete || dismissed) return null;

  return (
    <DashboardPanel className="relative p-6">
      {/* Dismiss button */}
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-600 transition-colors hover:text-zinc-300"
        aria-label="Dismiss getting started"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="pr-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Getting Started</p>
        <p className="mt-1 text-[15px] font-semibold text-white">
          {completedCount}/{totalSteps} complete
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[#25c972] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="mt-5 space-y-1">
        {steps.map((step, i) => {
          const isNext = !step.completed && steps.slice(0, i).every((s) => s.completed);
          return (
            <Link
              key={step.key}
              href={step.href}
              onClick={(e) => {
                const hash = step.href.split('#')[1];
                if (hash) {
                  const el = document.getElementById(hash);
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                isNext ? 'bg-[#356df4]/8' : 'hover:bg-white/[0.03]'
              )}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                {step.completed ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-[#25c972]" />
                ) : (
                  <Circle className={cn('h-4.5 w-4.5', isNext ? 'text-[#356df4]' : 'text-zinc-600')} />
                )}
              </div>
              <span className={cn(
                'flex-1 text-[13px] font-medium',
                step.completed ? 'text-zinc-500 line-through decoration-zinc-700' : isNext ? 'text-white' : 'text-zinc-400'
              )}>
                {step.label}
              </span>
              {isNext && <ChevronRight className="h-4 w-4 text-[#356df4]" />}
            </Link>
          );
        })}
      </div>
    </DashboardPanel>
  );
}
