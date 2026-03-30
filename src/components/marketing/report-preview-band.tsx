'use client';

import { FadeIn } from '@/components/marketing/motion';
import { cn } from '@/lib/utils';

function MiniBar({ widthPct, color }: { widthPct: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${widthPct}%` }}
      />
    </div>
  );
}

export function ReportPreviewBand() {
  return (
    <section className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-300)]">
              Inside the audit
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              A report you can act on the same day
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Scores, dimension breakdowns, and prioritized fixes—styled like your real workspace so you know what to
              expect after you scan.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="relative rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#0c0d10] to-[#060607] p-3 shadow-[0_40px_80px_rgba(0,0,0,0.45)] sm:p-4">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 pb-3 sm:px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-3 font-mono text-[10px] text-zinc-500">report — airadr</span>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:p-6">
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Sample domain</p>
                  <p className="mt-1 text-lg font-semibold text-white">yourbrand.com</p>
                </div>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">AI visibility</p>
                    <p className="mt-1 text-5xl font-bold tabular-nums tracking-tight text-white">78</p>
                  </div>
                  <span className="mb-2 rounded-full border border-[#25c972]/35 bg-[#25c972]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#25c972]">
                    AI Ready
                  </span>
                </div>
                <div className="space-y-3 rounded-xl border border-white/[0.06] bg-black/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Dimensions</p>
                  {[
                    { label: 'Crawler access', pct: 92, color: 'bg-[#356df4]' },
                    { label: 'Structured data', pct: 64, color: 'bg-[#16b7ca]' },
                    { label: 'Content quality', pct: 81, color: 'bg-[#25c972]' },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="text-zinc-400">{row.label}</span>
                        <span className="tabular-nums text-zinc-500">{row.pct}%</span>
                      </div>
                      <MiniBar widthPct={row.pct} color={row.color} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary-300)]">
                    Next up
                  </p>
                  <ul className="mt-3 space-y-2.5 text-[13px] leading-snug text-zinc-300">
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#25c972]" />
                      Allow GPTBot in robots.txt for stronger ChatGPT coverage
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#ff8a1e]" />
                      Add Organization JSON-LD on the homepage
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                      Publish an llms.txt that summarizes your key pages
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-dashed border-white/[0.1] bg-[#356df4]/[0.06] p-4">
                  <p className="text-[12px] font-medium text-zinc-200">
                    Download generated fix files matched to your stack—or open the full workspace for monitoring.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
