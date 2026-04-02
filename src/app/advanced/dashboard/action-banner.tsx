'use client';

import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

interface ActionBannerProps {
  fixCount: number;
  potentialLift: number;
  hasPaidPlan: boolean;
}

export function ActionBanner({ fixCount, potentialLift, hasPaidPlan }: ActionBannerProps) {
  if (fixCount === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
          <Zap className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">
            {fixCount} fix{fixCount !== 1 ? 'es' : ''} available
          </p>
          <p className="text-xs text-gray-600">
            Boost your score by up to <span className="font-semibold text-blue-700">+{Math.round(potentialLift)} points</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => document.getElementById('fixes-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
        >
          View Fixes
        </button>
        {!hasPaidPlan && (
          <Link
            href="/report#fix-my-site"
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Get Expert Help <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
