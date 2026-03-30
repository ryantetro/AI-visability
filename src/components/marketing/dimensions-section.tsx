'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Braces,
  FileSearch,
  FileText,
  Fingerprint,
  ShieldCheck,
} from 'lucide-react';
import { FadeIn, StaggerGrid, StaggerItem } from '@/components/marketing/motion';
import { cn } from '@/lib/utils';

/** Per-row accents: left bar + tinted icon plate + points tint (aligned with product palette). */
const DIMS: readonly {
  title: string;
  desc: string;
  pts: string;
  Icon: LucideIcon;
  accent: {
    stripe: string;
    iconPlate: string;
    pts: string;
  };
}[] = [
  {
    title: 'Crawler Access',
    desc: 'Can AI bots find your key files? We check robots.txt, sitemap, and llms.txt.',
    pts: '20 pts',
    Icon: FileSearch,
    accent: {
      stripe: 'border-l-2 border-l-[#356df4]',
      iconPlate:
        'border-[#356df4]/40 bg-[#356df4]/12 text-[#9bb6ff] group-hover:border-[#356df4]/60 group-hover:bg-[#356df4]/18 group-hover:text-[#c5d4ff]',
      pts: 'text-[#7d9eff]/95',
    },
  },
  {
    title: 'Structured Data',
    desc: 'Does your site tell AI who you are? We check for schema markup that describes your business.',
    pts: '20 pts',
    Icon: Braces,
    accent: {
      stripe: 'border-l-2 border-l-[#16b7ca]',
      iconPlate:
        'border-[#16b7ca]/40 bg-[#16b7ca]/12 text-[#7ee8f0] group-hover:border-[#16b7ca]/60 group-hover:bg-[#16b7ca]/18 group-hover:text-[#b2f0f5]',
      pts: 'text-[#5ed4e0]/95',
    },
  },
  {
    title: 'Content Quality',
    desc: 'Can AI pull useful info from your pages? We check about pages, service descriptions, and freshness.',
    pts: '20 pts',
    Icon: FileText,
    accent: {
      stripe: 'border-l-2 border-l-[#25c972]',
      iconPlate:
        'border-[#25c972]/40 bg-[#25c972]/12 text-[#7ee0ae] group-hover:border-[#25c972]/58 group-hover:bg-[#25c972]/18 group-hover:text-[#b8f0cf]',
      pts: 'text-[#4ade80]/95',
    },
  },
  {
    title: 'Your Expertise',
    desc: 'Do you publish consistently about what you offer? We check topic focus, linking, and depth.',
    pts: '20 pts',
    Icon: BookOpen,
    accent: {
      stripe: 'border-l-2 border-l-[#f0a04d]',
      iconPlate:
        'border-[#f0a04d]/45 bg-[#f0a04d]/12 text-[#fac898] group-hover:border-[#f0a04d]/65 group-hover:bg-[#f0a04d]/20 group-hover:text-[#ffd9b3]',
      pts: 'text-[#e8a05c]/95',
    },
  },
  {
    title: 'Your Identity',
    desc: 'Are you recognizable across the web? We check brand consistency and authority signals.',
    pts: '10 pts',
    Icon: Fingerprint,
    accent: {
      stripe: 'border-l-2 border-l-[#b794f6]',
      iconPlate:
        'border-[#b794f6]/42 bg-[#b794f6]/12 text-[#d4c4fc] group-hover:border-[#b794f6]/62 group-hover:bg-[#b794f6]/20 group-hover:text-[#ece6ff]',
      pts: 'text-[#c4b0fd]/95',
    },
  },
  {
    title: 'AI Access',
    desc: 'Have you given AI engines explicit permission to crawl? We check bot access rules and AI-specific files.',
    pts: '10 pts',
    Icon: ShieldCheck,
    accent: {
      stripe: 'border-l-2 border-l-[#7ba9ff]',
      iconPlate:
        'border-[#7ba9ff]/42 bg-[#7ba9ff]/14 text-[#aec8ff] group-hover:border-[#7ba9ff]/62 group-hover:bg-[#7ba9ff]/22 group-hover:text-[#dce6ff]',
      pts: 'text-[#94b8ff]/95',
    },
  },
];

export function DimensionsSection() {
  return (
    <section className="relative border-t border-white/[0.07] px-4 py-16 sm:py-20 lg:py-24" aria-labelledby="dimensions-heading">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="grid items-end gap-8 lg:grid-cols-12 lg:gap-12 lg:gap-y-10">
            <div className="lg:col-span-5">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                Scoring model
              </p>
              <h2
                id="dimensions-heading"
                className="font-display mt-4 bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-[1.875rem] font-semibold leading-[1.1] tracking-[-0.035em] text-transparent sm:text-[2.125rem] lg:text-[2.25rem]"
              >
                What we check
              </h2>
            </div>
            <p className="text-[15px] leading-[1.72] text-zinc-400 lg:col-span-7 lg:pb-1 lg:pl-2">
              Six dimensions that determine how AI search engines see your business. Each maps to concrete checks from your
              crawl—not abstract “AI scores” from a black box.
            </p>
          </div>
        </FadeIn>

        <StaggerGrid className="mt-12 divide-y divide-white/[0.07] border-t border-white/[0.07] sm:mt-14 lg:mt-16">
          {DIMS.map((dim) => (
            <StaggerItem key={dim.title}>
              <article
                className={cn(
                  'group -mx-1 flex flex-col gap-5 py-9 pl-4 transition-colors first:pt-10 sm:-mx-2 sm:flex-row sm:gap-8 sm:pl-6 sm:pr-2 sm:py-10 lg:py-11 lg:first:pt-12',
                  dim.accent.stripe,
                )}
              >
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border transition-colors',
                    dim.accent.iconPlate,
                  )}
                  aria-hidden
                >
                  <dim.Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4">
                    <h3 className="text-[1.0625rem] font-semibold tracking-tight text-white">{dim.title}</h3>
                    <span
                      className={cn(
                        'font-mono text-[11px] font-medium uppercase tracking-[0.14em]',
                        dim.accent.pts,
                      )}
                    >
                      {dim.pts}
                    </span>
                  </div>
                  <p className="mt-2.5 max-w-2xl text-[14px] leading-[1.65] text-zinc-400 sm:text-[15px] sm:leading-[1.7]">
                    {dim.desc}
                  </p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>
    </section>
  );
}
