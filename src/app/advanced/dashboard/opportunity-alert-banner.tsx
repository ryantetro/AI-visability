'use client';

import Link from 'next/link';
import { ArrowRight, Settings2, Sparkles, Zap } from 'lucide-react';
import { EngineIcon } from '../panels/shared';
import { PROVIDER_LABELS } from '../lib/constants';
import type { OpportunityAlertSummary } from '@/types/services';

function buildReportHref(summary: OpportunityAlertSummary, reportId?: string | null) {
  const resolvedReportId = summary.latestScanId ?? reportId ?? null;
  return resolvedReportId
    ? `/report?report=${encodeURIComponent(resolvedReportId)}`
    : '/report';
}

function buildSettingsHref(domain: string, reportId?: string | null) {
  const params = new URLSearchParams();
  params.set('domain', domain);
  if (reportId) params.set('report', reportId);
  return `/settings?${params.toString()}#monitoring`;
}

/* ── Animated ring visual showing crawl vs referral ratio ── */
function OpportunityRing({ crawls, referrals }: { crawls: number; referrals: number }) {
  const total = crawls + referrals;
  const crawlPct = total > 0 ? (crawls / total) * 100 : 0;
  const circumference = 2 * Math.PI * 42;
  const crawlDash = (crawlPct / 100) * circumference;
  const referralDash = circumference - crawlDash;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 100 100" className="drop-shadow-[0_0_24px_rgba(255,138,30,0.15)]">
        {/* Background track */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        {/* Referral arc (teal) */}
        <circle
          cx="50" cy="50" r="42"
          fill="none"
          stroke="#20b8cd"
          strokeWidth="6"
          strokeDasharray={`${referralDash} ${circumference}`}
          strokeDashoffset={-crawlDash}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          opacity="0.5"
        />
        {/* Crawler arc (orange) */}
        <circle
          cx="50" cy="50" r="42"
          fill="none"
          stroke="url(#orangeGrad)"
          strokeWidth="6"
          strokeDasharray={`${crawlDash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <defs>
          <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffbb00" />
            <stop offset="100%" stopColor="#ff8a1e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Zap className="h-4 w-4 text-[#ffbb00]" />
        <span className="mt-0.5 text-[20px] font-bold tabular-nums tracking-tight text-white">
          {total > 0 ? Math.round(crawlPct) : 0}%
        </span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">crawls</span>
      </div>
    </div>
  );
}

export function OpportunityAlertBanner({
  opportunity,
  reportId,
  onSeeTraffic,
}: {
  opportunity: OpportunityAlertSummary;
  reportId?: string | null;
  onSeeTraffic: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#ff8a1e]/15 bg-[linear-gradient(135deg,rgba(14,11,8,0.98)_0%,rgba(10,10,12,0.99)_50%,rgba(8,12,14,0.98)_100%)] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8a1e]/25 to-transparent" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#ff8a1e]/[0.06] blur-[80px]" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[#20b8cd]/[0.05] blur-[60px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="relative px-6 pb-6 pt-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ff8a1e]/20 bg-[#ff8a1e]/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffc470]">
            <Sparkles className="h-3 w-3 text-[#ffbb00]" />
            AI Opportunity Alert
          </span>
          <Link
            href={buildSettingsHref(opportunity.domain, reportId)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
          >
            <Settings2 className="h-3 w-3" />
            Manage
          </Link>
        </div>

        {/* Main content: text left, ring visual right */}
        <div className="mt-5 flex items-start gap-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[22px]">
              AI engines are already reading your site
            </h2>
            <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-zinc-400">
              <span className="font-semibold text-white">{opportunity.crawlerVisits.toLocaleString()}</span> crawler visit{opportunity.crawlerVisits === 1 ? '' : 's'} and{' '}
              <span className="font-semibold text-white">{opportunity.referralVisits}</span> AI referral{opportunity.referralVisits === 1 ? '' : 's'} in the last 30 days.
              {' '}Attention is high, but AI-driven visits are still low.
            </p>

            {/* Inline stat pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#ff8a1e]/10 bg-[#ff8a1e]/[0.06] px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ff8a1e]" />
                <span className="text-[11px] font-semibold tabular-nums text-[#ffc470]">{opportunity.crawlerVisits.toLocaleString()}</span>
                <span className="text-[11px] text-zinc-500">crawls</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#20b8cd]/10 bg-[#20b8cd]/[0.06] px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#20b8cd]" />
                <span className="text-[11px] font-semibold tabular-nums text-[#6dd8e8]">{opportunity.referralVisits}</span>
                <span className="text-[11px] text-zinc-500">referrals</span>
              </div>
            </div>
          </div>

          {/* Ring visual — hidden on very small screens */}
          <div className="hidden shrink-0 sm:block">
            <OpportunityRing crawls={opportunity.crawlerVisits} referrals={opportunity.referralVisits} />
          </div>
        </div>

        {/* Provider chips + CTA — unified row */}
        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Top Providers</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {opportunity.topProviders.map((provider) => (
                <div
                  key={provider.provider}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 transition-colors hover:bg-white/[0.06]"
                >
                  <EngineIcon engine={provider.provider} className="size-3.5" />
                  <span className="text-[11px] font-medium text-zinc-300">
                    {PROVIDER_LABELS[provider.provider] ?? provider.provider}
                  </span>
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {provider.visits}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              href={buildReportHref(opportunity, reportId)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#ff9a3e] to-[#ff8a1e] px-5 py-2.5 text-[12px] font-semibold text-white shadow-[0_2px_12px_rgba(255,138,30,0.25)] transition-all hover:shadow-[0_4px_20px_rgba(255,138,30,0.35)] hover:brightness-110"
            >
              Open Priority Fixes
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={onSeeTraffic}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium text-zinc-300 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
            >
              See traffic details
            </button>
          </div>
        </div>

        {/* Top opportunity pages */}
        {opportunity.topPages.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between px-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Top Opportunity Pages</p>
              <p className="text-[11px] text-zinc-600">Highest crawler attention, lowest referrals</p>
            </div>
            <div className="mt-2.5 grid gap-2 md:grid-cols-3">
              {opportunity.topPages.map((page, index) => (
                <div
                  key={page.path}
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#ff8a1e]/10 text-[10px] font-bold text-[#ff8a1e]">
                      {index + 1}
                    </span>
                    <span className="text-[10px] font-semibold tabular-nums text-zinc-500">
                      {page.crawlerVisits} crawl{page.crawlerVisits === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[12px] font-medium text-zinc-200 group-hover:text-white">{page.path}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-[#20b8cd]/50" />
                    <span className="text-[10px] text-zinc-500">
                      {page.referralVisits} referral{page.referralVisits === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
