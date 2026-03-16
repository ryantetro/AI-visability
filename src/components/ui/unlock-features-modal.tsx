'use client';

import { useState } from 'react';
import { Check, Crown, Zap, X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const FEATURES = [
  'Unlimited website analyses',
  'High authority do-follow backlink',
  'Website score badge',
  'Daily automated monitoring (up to 10 domains)',
  'Critical change alerts',
  'History tracking',
  'Certified report page',
  'Copy to LLM',
];

interface UnlockFeaturesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onUnlock?: (plan: 'monthly' | 'lifetime') => void;
}

export function UnlockFeaturesModal({
  open,
  onOpenChange,
  loading = false,
  onUnlock,
}: UnlockFeaturesModalProps) {
  const [plan, setPlan] = useState<'monthly' | 'lifetime'>('lifetime');

  const handleUnlock = () => {
    if (onUnlock) {
      onUnlock(plan);
    } else {
      onOpenChange(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="center"
        showClose={false}
        className="max-w-md border-0 bg-[var(--surface-page)] p-0 shadow-xl"
      >
        <div className="relative overflow-hidden rounded-2xl">
          <SheetClose className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <div className="px-6 pt-8 pb-6">
            <SheetTitle className="text-center text-xl font-semibold text-zinc-200">
              Unlock all features
            </SheetTitle>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlan('monthly')}
                className={cn(
                  'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors',
                  plan === 'monthly'
                    ? 'border-[#25c972] bg-[#1a3d2a]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/15'
                )}
              >
                {plan === 'monthly' && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#25c972]">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
                <Zap className="mb-2 h-5 w-5 text-zinc-400" />
                <span className="text-base font-semibold text-zinc-200">Monthly</span>
                <span className="mt-1 text-2xl font-bold text-zinc-100">$5</span>
                <span className="text-xs text-zinc-400">per month</span>
              </button>

              <button
                type="button"
                onClick={() => setPlan('lifetime')}
                className={cn(
                  'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors',
                  plan === 'lifetime'
                    ? 'border-[#25c972] bg-[#1a3d2a]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/15'
                )}
              >
                {plan === 'lifetime' && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#25c972]">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
                <Crown className="mb-2 h-5 w-5 text-amber-400" />
                <span className="text-base font-semibold text-zinc-200">Lifetime</span>
                <span className="mt-1 text-2xl font-bold text-zinc-100">$35</span>
                <span className="text-xs text-zinc-400">one-time</span>
              </button>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Everything you&apos;ll get
              </p>
              <ul className="space-y-2.5">
                {FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 text-sm text-zinc-400"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25c972]/20">
                      <Check className="h-3 w-3 text-[#25c972]" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={handleUnlock}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-white/[0.06] px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] disabled:opacity-50"
            >
              {loading ? 'Starting checkout...' : plan === 'monthly' ? 'Subscribe Monthly' : 'Get Lifetime Access'}
            </button>
            <p className="mt-2 text-center text-xs text-zinc-500">
              {plan === 'monthly' ? 'Cancel anytime' : 'No subscription • One-time payment'}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
