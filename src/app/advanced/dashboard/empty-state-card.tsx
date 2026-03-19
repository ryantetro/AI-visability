'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';

interface EmptyStateCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  ghostRows?: number;
}

export function EmptyStateCard({
  icon: Icon,
  iconColor = '#a855f7',
  title,
  description,
  ctaLabel,
  ctaHref,
  ghostRows = 3,
}: EmptyStateCardProps) {
  return (
    <div className="space-y-3">
      {/* Ghost rows — dashed placeholder rows */}
      {Array.from({ length: ghostRows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-dashed border-white/8 bg-white/[0.01] px-3 py-2.5"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[10px] font-semibold text-zinc-600">
            {i + 1}
          </span>
          <div className="h-2.5 flex-1 rounded-full bg-white/[0.04]" />
          <div className="h-2.5 w-10 rounded-full bg-white/[0.04]" />
        </div>
      ))}

      {/* Empty state message */}
      <div className="flex flex-col items-center py-4 text-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        <p className="mt-3 text-[13px] font-semibold text-zinc-200">{title}</p>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[12px] leading-5 text-zinc-500">
          {description}
        </p>
        <Link
          href={ctaHref}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold transition-colors hover:text-white"
          style={{ color: iconColor }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
