'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { PLANS, type BillingCycle, type PlanTier, type PaymentPlanString } from '@/lib/pricing';

type PaidTier = Exclude<PlanTier, 'free'>;

interface UnlockFeaturesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onUnlock?: (plan: PaymentPlanString) => void;
  contextFeature?: string;
  contextTier?: PaidTier;
}

const PAID_TIERS: PaidTier[] = ['starter', 'pro', 'growth'];

export function UnlockFeaturesModal({
  open,
  onOpenChange,
  loading = false,
  onUnlock,
  contextFeature,
  contextTier,
}: UnlockFeaturesModalProps) {
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const [selectedTier, setSelectedTier] = useState<PaidTier>(contextTier ?? 'starter');

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

  const getPrice = (tier: PaidTier) => {
    const plan = PLANS[tier];
    return cycle === 'annual' ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
  };

  const selectedPlan = PLANS[selectedTier];
  const selectedPrice = getPrice(selectedTier);

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
            <div className="mt-5 grid grid-cols-3 gap-3">
              {PAID_TIERS.map((tier) => {
                const plan = PLANS[tier];
                const price = getPrice(tier);
                const isSelected = selectedTier === tier;
                const isPopular = tier === 'pro';

                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedTier(tier)}
                    className={cn(
                      'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors',
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/15'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)]">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-base font-semibold text-zinc-200">
                      {plan.name}
                      {isPopular && (
                        <span className="rounded-full bg-[var(--color-primary)]/15 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-primary)]">
                          POPULAR
                        </span>
                      )}
                    </span>
                    <span className="mt-1 text-2xl font-bold text-zinc-100">${price}</span>
                    <span className="text-xs text-zinc-400">/month</span>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <Check className="h-2.5 w-2.5 text-[#25c972]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {cycle === 'annual' && (
              <p className="mt-3 text-center text-[11px] text-zinc-500">
                ${selectedPlan.annualPrice}/yr (save ${selectedPlan.monthlyPrice * 12 - selectedPlan.annualPrice})
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
                : `Get ${selectedPlan.name} — $${selectedPrice}/mo`
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
