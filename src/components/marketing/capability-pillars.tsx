'use client';

import Link from 'next/link';
import { ArrowRight, Bot, FileCode2, LineChart, MessageSquareText } from 'lucide-react';
import { StaggerGrid, StaggerItem } from '@/components/marketing/motion';
import { cn } from '@/lib/utils';

const PILLARS = [
  {
    title: 'See your AI visibility',
    desc: 'Run a free audit and get a 0–100 score with a clear breakdown of what AI engines can find—and what is blocking you.',
    href: '/#scan',
    cta: 'Run free audit',
    Icon: LineChart,
  },
  {
    title: 'Monitor mentions & prompts',
    desc: 'Track how leading models talk about your brand over time and manage a library of test prompts as you scale.',
    href: '/pricing',
    cta: 'View plans',
    Icon: MessageSquareText,
  },
  {
    title: 'Fix crawlability & structure',
    desc: 'Ship robots.txt, llms.txt, and structured-data fixes tailored from your crawl—not generic templates.',
    href: '/#scan',
    cta: 'Start with an audit',
    Icon: FileCode2,
  },
  {
    title: 'Crawler & referral insights',
    desc: 'See AI bots hit your pages and attribute human visits coming from AI surfaces when tracking is installed.',
    href: '/pricing',
    cta: 'Compare tiers',
    Icon: Bot,
  },
] as const;

export function CapabilityPillars() {
  return (
    <section className="relative px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Everything you need to win in AI search
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            From first audit to ongoing monitoring—built for teams that want signal, not guesswork.
          </p>
        </div>

        <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {PILLARS.map((p) => (
            <StaggerItem key={p.title}>
              <Link
                href={p.href}
                className={cn(
                  'group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all duration-300',
                  'hover:-translate-y-0.5 hover:border-[var(--color-primary-500)]/35 hover:bg-white/[0.04] hover:shadow-[0_20px_40px_rgba(0,0,0,0.35)]',
                )}
              >
                <div
                  className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[var(--color-primary-300)] transition-colors group-hover:border-[var(--color-primary-400)]/25 group-hover:text-[var(--color-primary-200)]"
                  aria-hidden
                >
                  <p.Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  {p.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-primary-300)] transition-colors group-hover:text-[var(--color-primary-200)]">
                  {p.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>
    </section>
  );
}
