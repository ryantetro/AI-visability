'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { PLANS, type BillingCycle, type PaymentPlanString } from '@/lib/pricing';

interface UnlockFeaturesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onUnlock?: (plan: PaymentPlanString) => void;
  contextFeature?: string;
  contextTier?: 'starter' | 'pro';
}

export function UnlockFeaturesModal({
  open,
  onOpenChange,
  loading = false,
  onUnlock,
  contextFeature,
  contextTier,
}: UnlockFeaturesModalProps) {
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const [selectedTier, setSelectedTier] = useState<'starter' | 'pro'>(contextTier ?? 'starter');

  const handleUnlock = () => {
    const plan = `${selectedTier}_${cycle}` as PaymentPlanString;
    if (onUnlock) {
      onUnlock(plan);
    } else {
      onOpenChange(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const starterPlan = PLANS.starter;
  const proPlan = PLANS.pro;

  const starterPrice = cycle === 'annual' ? Math.round(starterPlan.annualPrice / 12) : starterPlan.monthlyPrice;
  const proPrice = cycle === 'annual' ? Math.round(proPlan.annualPrice / 12) : proPlan.monthlyPrice;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="center"
        showClose={false}
        className="max-w-lg border-0 bg-[var(--surface-page)] p-0 shadow-xl"
      >
        <div className="relative overflow-hidden rounded-2xl">
          <SheetClose className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <div className="px-6 pt-8 pb-6">
            <SheetTitle className="text-center text-xl font-semibold text-zinc-200">
              {contextFeature
                ? `Upgrade to access ${contextFeature}`
                : 'Unlock all features'}
            </SheetTitle>

            {contextFeature && contextTier && (
              <p className="mt-2 text-center text-[13px] text-zinc-400">
                You need the {PLANS[contextTier].name} plan to access {contextFeature}.
              </p>
            )}

            {/* Billing toggle */}
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCycle('monthly')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                  cycle === 'monthly'
                    ? 'bg-white/[0.1] text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setCycle('annual')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                  cycle === 'annual'
                    ? 'bg-white/[0.1] text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                Annual
                <span className="ml-1 text-[10px] text-[#25c972]">~20% off</span>
              </button>
            </div>

            {/* Plan cards */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {/* Starter card */}
              <button
                type="button"
                onClick={() => setSelectedTier('starter')}
                className={cn(
                  'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors',
                  selectedTier === 'starter'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/15'
                )}
              >
                {selectedTier === 'starter' && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)]">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
                <span className="text-base font-semibold text-zinc-200">Starter</span>
                <span className="mt-1 text-2xl font-bold text-zinc-100">${starterPrice}</span>
                <span className="text-xs text-zinc-400">/month</span>
                <ul className="mt-3 space-y-1.5">
                  {starterPlan.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Check className="h-2.5 w-2.5 text-[#25c972]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>

              {/* Pro card */}
              <button
                type="button"
                onClick={() => setSelectedTier('pro')}
                className={cn(
                  'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors',
                  selectedTier === 'pro'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/15'
                )}
              >
                {selectedTier === 'pro' && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)]">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-base font-semibold text-zinc-200">
                  Pro
                  <span className="rounded-full bg-[var(--color-primary)]/15 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-primary)]">
                    POPULAR
                  </span>
                </span>
                <span className="mt-1 text-2xl font-bold text-zinc-100">${proPrice}</span>
                <span className="text-xs text-zinc-400">/month</span>
                <ul className="mt-3 space-y-1.5">
                  {proPlan.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Check className="h-2.5 w-2.5 text-[#25c972]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            </div>

            {cycle === 'annual' && (
              <p className="mt-3 text-center text-[11px] text-zinc-500">
                {selectedTier === 'starter'
                  ? `$${starterPlan.annualPrice}/yr (save $${starterPlan.monthlyPrice * 12 - starterPlan.annualPrice})`
                  : `$${proPlan.annualPrice}/yr (save $${proPlan.monthlyPrice * 12 - proPlan.annualPrice})`
                }
              </p>
            )}

            <button
              type="button"
              onClick={handleUnlock}
              disabled={loading}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loading
                ? 'Starting checkout...'
                : `Get ${selectedTier === 'starter' ? 'Starter' : 'Pro'} — $${selectedTier === 'starter' ? starterPrice : proPrice}/mo`
              }
            </button>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] text-zinc-500">Cancel anytime</p>
              <Link
                href="/pricing"
                className="text-[11px] font-medium text-zinc-400 transition-colors hover:text-white"
                onClick={() => onOpenChange(false)}
              >
                View full pricing &rarr;
              </Link>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
