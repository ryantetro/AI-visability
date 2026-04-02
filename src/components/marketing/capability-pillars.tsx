'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StaggerGrid, StaggerItem } from '@/components/marketing/motion';
import {
  PillarVisualVisibility,
  PillarVisualPrompts,
  PillarVisualFixes,
  PillarVisualCrawler,
} from '@/components/marketing/capability-pillar-visuals';
import { cn } from '@/lib/utils';

const PILLARS = [
  {
    step: 1,
    title: 'See your AI visibility',
    desc: 'Run a free audit and get a 0–100 score with a clear breakdown of what AI engines can find—and what is blocking you.',
    href: '/#scan',
    cta: 'Run free audit',
    Visual: PillarVisualVisibility,
  },
  {
    step: 2,
    title: 'Monitor mentions & prompts',
    desc: 'Track how leading models talk about your brand over time and manage a library of test prompts as you scale.',
    href: '/pricing',
    cta: 'View plans',
    Visual: PillarVisualPrompts,
  },
  {
    step: 3,
    title: 'Fix crawlability & structure',
    desc: 'Ship robots.txt, llms.txt, and structured-data fixes tailored from your crawl—not generic templates.',
    href: '/#scan',
    cta: 'Start with an audit',
    Visual: PillarVisualFixes,
  },
  {
    step: 4,
    title: 'Crawler & referral insights',
    desc: 'See AI bots hit your pages and attribute human visits coming from AI surfaces when tracking is installed.',
    href: '/pricing',
    cta: 'Compare tiers',
    Visual: PillarVisualCrawler,
  },
] as const;

function GridBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.4]"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(to right, rgb(15 23 42 / 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgb(15 23 42 / 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    />
  );
}

export function CapabilityPillars() {
  return (
    <section className="relative border-t border-gray-200/80 bg-gray-50/60 px-4 py-24">
      <GridBackdrop />
      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Everything you need to win in AI search
          </h2>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-gray-600">
            From first audit to ongoing monitoring—built for teams that want signal, not guesswork.
          </p>
        </div>

        <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {PILLARS.map((p) => (
            <StaggerItem key={p.title}>
              <Link
                href={p.href}
                className={cn(
                  'group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300',
                  'hover:-translate-y-0.5 hover:border-[var(--color-primary-300)] hover:shadow-md',
                )}
              >
                <div className="relative border-b border-gray-100 bg-white px-5 pb-5 pt-5">
                  <span className="absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500">
                    {p.step}
                  </span>
                  <div className="mt-6">
                    <p.Visual />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold text-gray-900">{p.title}</h3>
                  <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-gray-600">{p.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-primary-600)] transition-colors group-hover:text-[var(--color-primary-700)]">
                    {p.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>
    </section>
  );
}
