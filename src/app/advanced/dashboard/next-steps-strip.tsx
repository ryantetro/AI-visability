'use client';

import Link from 'next/link';
import { ChevronRight, FileText, LineChart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reportHref, brandHref, dashboardTrackingHref } from '@/lib/workspace-nav';

interface NextStepsStripProps {
  reportId: string | null | undefined;
}

const steps: Array<{
  n: number;
  title: string;
  subtitle: string;
  href: (id: string | null | undefined) => string;
  Icon: typeof FileText;
  scrollOnly?: boolean;
}> = [
  {
    n: 1,
    title: 'Fix baseline',
    subtitle: 'Priority fixes, meta, trust & speed',
    href: (id: string | null | undefined) => reportHref(id, 'section-repair-queue'),
    Icon: FileText,
  },
  {
    n: 2,
    title: 'Improve AI answers',
    subtitle: 'Prompts & content for weak queries',
    href: (id: string | null | undefined) => brandHref(id),
    Icon: Sparkles,
  },
  {
    n: 3,
    title: 'Track ongoing',
    subtitle: 'Monitoring & bot traffic',
    href: (id: string | null | undefined) => dashboardTrackingHref(id),
    Icon: LineChart,
    scrollOnly: true,
  },
];

export function NextStepsStrip({ reportId }: NextStepsStripProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Your next steps
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => {
          const href = step.href(reportId);
          const Icon = step.Icon;
          return (
            <Link
              key={step.n}
              href={href}
              onClick={(e) => {
                if (!step.scrollOnly) return;
                const hash = href.split('#')[1];
                if (hash && typeof window !== 'undefined' && window.location.pathname === '/dashboard') {
                  const el = document.getElementById(hash);
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
              }}
              className={cn(
                'group flex gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors',
                'hover:border-white/[0.12] hover:bg-white/[0.04]',
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffbb00]/15 text-[12px] font-bold text-[#ffbb00]">
                {step.n}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  <span className="text-[13px] font-semibold text-zinc-100">{step.title}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{step.subtitle}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
