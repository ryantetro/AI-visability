'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';
import { MARKETING_SAMPLE_SCORE_ID } from '@/lib/marketing-constants';

export function SampleScoreCta() {
  const hasSample = MARKETING_SAMPLE_SCORE_ID.length > 0;
  return (
    <section className="relative px-4 py-20">
      <FadeIn>
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[var(--color-primary-600)]/20 via-transparent to-[#16b7ca]/10 px-6 py-12 text-center sm:px-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-200)]">
            See it live
          </p>
          <h2 className="mx-auto mt-3 max-w-xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {hasSample ? 'View a public score card' : 'Shareable score cards for every audit'}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-zinc-400">
            {hasSample
              ? 'This sample mirrors what prospects see when you share a read-only score link—great for decks, slack, and investor updates.'
              : 'Every completed audit gets a shareable /score page. Run a free audit on your site to generate yours—or set NEXT_PUBLIC_SAMPLE_SCORE_ID to feature a demo link here.'}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {hasSample ? (
              <Link
                href={`/score/${MARKETING_SAMPLE_SCORE_ID}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-zinc-900 transition-transform hover:scale-[1.02] hover:bg-zinc-100"
              >
                Open sample report
                <ExternalLink className="h-4 w-4 opacity-70" />
              </Link>
            ) : null}
            <Link
              href="/#scan"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.2] bg-white/[0.05] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:border-white/[0.35] hover:bg-white/[0.08]"
            >
              Run your free audit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
