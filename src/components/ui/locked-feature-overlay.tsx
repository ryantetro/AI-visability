'use client';

import { Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { type PlanTier, PLANS } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface LockedFeatureOverlayProps {
  featureName: string;
  requiredTier: PlanTier;
  description?: string;
  variant?: 'full-page' | 'inline';
  onUpgrade?: () => void;
}

const TIER_DESCRIPTIONS: Record<string, string> = {
  dashboard: 'View your full AI visibility dashboard with scores, monitoring, and insights.',
  report: 'Access your detailed AI visibility report with check-by-check analysis.',
  brand: 'Track brand mentions and prompt performance across AI engines.',
  competitors: 'Monitor competitor visibility and compare your AI presence.',
  history: 'View your scan history and track score changes over time.',
  settings: 'Configure monitoring, notifications, and account settings.',
};

export function LockedFeatureOverlay({
  featureName,
  requiredTier,
  description,
  variant = 'full-page',
  onUpgrade,
}: LockedFeatureOverlayProps) {
  const planName = PLANS[requiredTier].name;
  const desc = description ?? TIER_DESCRIPTIONS[featureName.toLowerCase()] ?? `Access ${featureName} and more with the ${planName} plan.`;

  if (variant === 'inline') {
    return (
      <div className="relative">
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <Lock className="h-4 w-4 text-zinc-400" />
            <p className="text-xs font-medium text-zinc-300">
              Available in {planName}
            </p>
            {onUpgrade ? (
              <button
                type="button"
                onClick={onUpgrade}
                className="mt-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Upgrade
              </button>
            ) : (
              <Link
                href="/pricing"
                className="mt-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                View Plans
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <Lock className="h-7 w-7 text-zinc-400" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-white">
          {featureName}
        </h2>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
          Available in {planName}
        </p>
        <p className="mx-auto mt-4 max-w-sm text-[13px] leading-6 text-zinc-400">
          {desc}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {onUpgrade ? (
            <button
              type="button"
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Upgrade to {planName}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              View Plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            href="/#scan"
            className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Or run a free scan instead
          </Link>
        </div>
      </div>
    </div>
  );
}
