'use client';

import { motion } from 'framer-motion';
import { FadeIn, motionEase, usePrefersReducedMotion } from '@/components/marketing/motion';

const SPECS = [
  { value: '5+', label: 'platforms' },
  { value: '19', label: 'signals' },
  { value: '~30s', label: 'typical audit' },
  { value: '6', label: 'score dimensions' },
] as const;

export function ShiftSection() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      className="relative px-4 py-16 sm:py-20 lg:py-24"
      aria-labelledby="shift-heading"
    >
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <div className="flex gap-6 sm:gap-7">
                <motion.div
                  className="mt-1 hidden w-px shrink-0 origin-top bg-gradient-to-b from-[var(--color-primary-400)] via-white/20 to-transparent sm:block sm:min-h-[11rem]"
                  initial={reduce ? undefined : { scaleY: 0 }}
                  whileInView={reduce ? undefined : { scaleY: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.75, ease: motionEase }}
                  aria-hidden
                />
                <div className="min-w-0 pt-0.5">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    The shift
                  </p>
                  <h2
                    id="shift-heading"
                    className="font-display mt-5 text-[1.625rem] font-semibold leading-[1.12] tracking-[-0.035em] text-white sm:text-[1.875rem] lg:text-[2.0625rem]"
                  >
                    Customers want answers, not a page of blue links.
                  </h2>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="max-w-xl lg:max-w-none lg:pt-1">
                <p className="text-[15px] leading-[1.72] text-zinc-400 sm:text-[1.0625rem] sm:leading-[1.75]">
                  People increasingly ask ChatGPT-style assistants for recommendations before they bother with ten search
                  results.{' '}
                  <span className="text-zinc-200">airadr</span> shows what those models can see about your business, where
                  you are invisible, and what to fix first—grounded in a real crawl, not a checklist template.
                </p>
              </div>

              <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/[0.07] pt-10 sm:mt-12 sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-10 sm:gap-y-4 sm:pt-11 lg:mt-14 lg:pt-12">
                {SPECS.map((row) => (
                  <div key={row.label} className="min-w-0 sm:w-auto">
                    <dt className="sr-only">{row.label}</dt>
                    <dd className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                      <span className="font-mono text-lg font-medium tabular-nums tracking-tight text-white sm:text-xl">
                        {row.value}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">{row.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
