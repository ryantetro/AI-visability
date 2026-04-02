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
      stripe: 'border-l-2 border-l-[#2563eb]',
      iconPlate:
        'border-blue-200 bg-blue-50 text-blue-700 group-hover:border-blue-300 group-hover:bg-blue-100 group-hover:text-blue-800',
      pts: 'text-blue-700',
    },
  },
  {
    title: 'Structured Data',
    desc: 'Does your site tell AI who you are? We check for schema markup that describes your business.',
    pts: '20 pts',
    Icon: Braces,
    accent: {
      stripe: 'border-l-2 border-l-[#0891b2]',
      iconPlate:
        'border-cyan-200 bg-cyan-50 text-cyan-800 group-hover:border-cyan-300 group-hover:bg-cyan-100 group-hover:text-cyan-900',
      pts: 'text-cyan-800',
    },
  },
  {
    title: 'Content Quality',
    desc: 'Can AI pull useful info from your pages? We check about pages, service descriptions, and freshness.',
    pts: '20 pts',
    Icon: FileText,
    accent: {
      stripe: 'border-l-2 border-l-[#16a34a]',
      iconPlate:
        'border-green-200 bg-green-50 text-green-800 group-hover:border-green-300 group-hover:bg-green-100 group-hover:text-green-900',
      pts: 'text-green-800',
    },
  },
  {
    title: 'Your Expertise',
    desc: 'Do you publish consistently about what you offer? We check topic focus, linking, and depth.',
    pts: '20 pts',
    Icon: BookOpen,
    accent: {
      stripe: 'border-l-2 border-l-[#ea580c]',
      iconPlate:
        'border-orange-200 bg-orange-50 text-orange-800 group-hover:border-orange-300 group-hover:bg-orange-100 group-hover:text-orange-900',
      pts: 'text-orange-800',
    },
  },
  {
    title: 'Your Identity',
    desc: 'Are you recognizable across the web? We check brand consistency and authority signals.',
    pts: '10 pts',
    Icon: Fingerprint,
    accent: {
      stripe: 'border-l-2 border-l-[#7c3aed]',
      iconPlate:
        'border-violet-200 bg-violet-50 text-violet-800 group-hover:border-violet-300 group-hover:bg-violet-100 group-hover:text-violet-900',
      pts: 'text-violet-800',
    },
  },
  {
    title: 'AI Access',
    desc: 'Have you given AI engines explicit permission to crawl? We check bot access rules and AI-specific files.',
    pts: '10 pts',
    Icon: ShieldCheck,
    accent: {
      stripe: 'border-l-2 border-l-[#4f46e5]',
      iconPlate:
        'border-indigo-200 bg-indigo-50 text-indigo-800 group-hover:border-indigo-300 group-hover:bg-indigo-100 group-hover:text-indigo-900',
      pts: 'text-indigo-800',
    },
  },
];

export function DimensionsSection() {
  return (
    <section className="relative border-t border-gray-200 px-4 py-16 sm:py-20 lg:py-24" aria-labelledby="dimensions-heading">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="grid items-end gap-8 lg:grid-cols-12 lg:gap-12 lg:gap-y-10">
            <div className="lg:col-span-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                Scoring model
              </p>
              <h2
                id="dimensions-heading"
                className="font-display mt-4 text-[1.875rem] font-semibold leading-[1.1] tracking-[-0.035em] text-gray-900 sm:text-[2.125rem] lg:text-[2.25rem]"
              >
                What we check
              </h2>
            </div>
            <p className="text-[15px] font-medium leading-[1.72] text-gray-600 lg:col-span-7 lg:pb-1 lg:pl-2">
              Six dimensions that determine how AI search engines see your business. Each maps to concrete checks from your
              crawl—not abstract “AI scores” from a black box.
            </p>
          </div>
        </FadeIn>

        <StaggerGrid className="mt-12 divide-y divide-gray-200 border-t border-gray-200 sm:mt-14 lg:mt-16">
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
                  <dim.Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4">
                    <h3 className="text-[1.0625rem] font-semibold tracking-tight text-gray-900">{dim.title}</h3>
                    <span
                      className={cn(
                        'font-mono text-[11px] font-bold uppercase tracking-[0.14em]',
                        dim.accent.pts,
                      )}
                    >
                      {dim.pts}
                    </span>
                  </div>
                  <p className="mt-2.5 max-w-2xl text-[14px] font-medium leading-[1.65] text-gray-600 sm:text-[15px] sm:leading-[1.7]">
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
