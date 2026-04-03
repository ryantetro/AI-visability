'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

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
      {Array.from({ length: ghostRows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-3 py-2.5"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600">
            {i + 1}
          </span>
          <div className="h-2.5 flex-1 rounded-full bg-gray-100" />
          <div className="h-2.5 w-10 rounded-full bg-gray-100" />
        </div>
      ))}

      <div className="flex flex-col items-center py-4 text-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        <p className="mt-3 text-[13px] font-semibold text-gray-800">{title}</p>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[12px] leading-5 text-gray-600">
          {description}
        </p>
        <Link
          href={ctaHref}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold transition-opacity hover:opacity-80"
          style={{ color: iconColor }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
