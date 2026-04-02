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
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-[var(--color-primary-50)] via-white to-cyan-50 px-6 py-12 text-center shadow-sm sm:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary-700)]">
            See it live
          </p>
          <h2 className="mx-auto mt-3 max-w-xl text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {hasSample ? 'View a public score card' : 'Shareable score cards for every audit'}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] font-medium leading-relaxed text-gray-600">
            {hasSample
              ? 'This sample mirrors what prospects see when you share a read-only score link—great for decks, slack, and investor updates.'
              : 'Every completed audit gets a shareable /score page. Run a free audit on your site to generate yours—or set NEXT_PUBLIC_SAMPLE_SCORE_ID to feature a demo link here.'}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {hasSample ? (
              <Link
                href={`/score/${MARKETING_SAMPLE_SCORE_ID}`}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-600)] px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:scale-[1.02] hover:opacity-95"
              >
                Open sample report
                <ExternalLink className="h-4 w-4 opacity-90" />
              </Link>
            ) : null}
            <Link
              href="/#scan"
              className="inline-flex items-center gap-2 rounded-full border-2 border-gray-300 bg-white px-6 py-3 text-[14px] font-semibold text-gray-900 transition-colors hover:border-gray-400 hover:bg-gray-50"
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
