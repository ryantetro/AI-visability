'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { FadeIn } from '@/components/marketing/motion';

export function AgenciesCtaBand() {
  return (
    <section className="relative px-4 py-16">
      <FadeIn>
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-10 text-center sm:flex-row sm:text-left sm:px-10">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[var(--color-primary-500)]/15 text-[var(--color-primary-200)]"
            aria-hidden
          >
            <Users className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">For agencies & multi-brand teams</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">
              Shared domains, invitations, and plan-aware limits—so you can run AI visibility audits for every client from one
              workspace.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.06] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.1]"
          >
            See team plans
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}
