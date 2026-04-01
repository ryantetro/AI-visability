'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ChevronRight,
  Copy,
  Eye,
  Hash,
  MessageSquare,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';
import { getFaviconUrl } from '@/lib/url-utils';
import { ChatGPTIcon, PerplexityIcon, GeminiIcon, ClaudeIcon, GrokIcon } from '@/components/ui/ai-icons';
import { scoreColor, barFillColor, formatRelativeTime, getScoreColor } from '../lib/utils';
import { ENGINE_COLORS } from '../lib/constants';
import { computeAverageRank, computeProminenceFallback, formatAverageRankDisplay } from '../lib/mention-utils';
import { AI_ENGINES, AI_ENGINE_META, getAIEngineLabel } from '@/lib/ai-engines';
import { MonitoringTrendsPanel } from '../panels/monitoring-trends-panel';
import { PromptAnalyticsPanel } from '../panels/prompt-analytics-panel';
import { AICrawlerPanel } from '../panels/ai-crawler-panel';
import { AIReferralPanel } from '../panels/ai-referral-panel';
import { EmptyStateCard } from './empty-state-card';
import { QuickWinsSection } from './quick-wins-section';
import { OpportunityAlertBanner } from './opportunity-alert-banner';
import { OnboardingChecklist } from '@/components/app/onboarding-checklist';
import { NextStepsCard } from '@/components/app/next-steps-card';
import { usePlan } from '@/hooks/use-plan';
import type { DashboardReportData, RecentScanData } from '../lib/types';
import type { CompetitorComparisonData } from '@/types/competitors';
import type { OpportunityAlertSummary } from '@/types/services';

interface DashboardSectionProps {
  report: DashboardReportData;
  recentScans: RecentScanData[];
  domain: string;
  lastScannedAt: number | null;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onEnableMonitoring: () => void;
  onReaudit?: () => void;
  reauditing?: boolean;
}

const ENGINE_DISPLAY: Record<string, { label: string; color: string; Icon?: React.ComponentType<{ className?: string }> }> = {
  chatgpt: { label: 'ChatGPT', color: AI_ENGINE_META.chatgpt.color, Icon: ChatGPTIcon },
  perplexity: { label: 'Perplexity', color: AI_ENGINE_META.perplexity.color, Icon: PerplexityIcon },
  copilot: { label: 'Copilot', color: '#0ea5e9' },
  claude: { label: 'Claude', color: AI_ENGINE_META.claude.color, Icon: ClaudeIcon },
  gemini: { label: 'Gemini', color: AI_ENGINE_META.gemini.color, Icon: GeminiIcon },
  grok: { label: 'Grok', color: AI_ENGINE_META.grok.color, Icon: GrokIcon },
};

function getEngineDisplay(engine: string) {
  const key = engine.toLowerCase();
  return ENGINE_DISPLAY[key] ?? { label: engine, color: ENGINE_COLORS[key] ?? '#6b7280' };
}

export function DashboardSection({
  report,
  recentScans,
  domain,
  lastScannedAt,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
  onReaudit,
  reauditing,
}: DashboardSectionProps) {
  const scores = report.score.scores;
  const mentions = report.mentionSummary;
  const [renderedAt] = useState(() => Date.now());
  const { tier } = usePlan();

  // Lift tracking key + last signal so both panels share one API call
  const [trackingReady, setTrackingReady] = useState(false);
  const [trackingLastUsedAt, setTrackingLastUsedAt] = useState<string | null>(null);
  const [opportunityAlert, setOpportunityAlert] = useState<OpportunityAlertSummary | null>(null);
  useEffect(() => {
    if (!domain) return;
    let cancelled = false;
    fetch(`/api/user/tracking-key?domain=${encodeURIComponent(domain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setTrackingReady(Boolean(data.siteKey));
          setTrackingLastUsedAt(typeof data.lastUsedAt === 'string' ? data.lastUsedAt : null);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [domain]);

  useEffect(() => {
    if (!domain) return;
    let cancelled = false;

    fetch(`/api/opportunity-alert?domain=${encodeURIComponent(domain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setOpportunityAlert(data?.opportunity ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setOpportunityAlert(null);
      });

    return () => { cancelled = true; };
  }, [domain]);

  // Platform performance — include configured, unavailable, and backfill states.
  const mentionResults = mentions?.results ?? [];
  const platformCards = AI_ENGINES.map((engine) => {
    const stats = mentions?.engineBreakdown?.[engine];
    const status = mentions?.engineStatus?.[engine];
    return {
      engine,
      mentioned: stats?.mentioned ?? 0,
      total: stats?.total ?? 0,
      pct: stats?.total ? Math.round(((stats?.mentioned ?? 0) / stats.total) * 100) : 0,
      status: status?.status ?? 'not_backfilled',
    };
  }).filter((card) => card.total > 0 || card.status !== 'not_backfilled');

  // Total mentions
  const totalMentions = mentionResults.filter((r) => r.mentioned).length;
  const totalChecks = mentionResults.length;

  // Build engine breakdown string
  const engineBreakdown = platformCards
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)
    .map((pc) => {
      if (pc.status !== 'complete') {
        return `${getAIEngineLabel(pc.engine)} ${pc.status === 'not_configured' ? 'not configured' : 'pending backfill'}`;
      }
      const display = getEngineDisplay(pc.engine);
      return `${pc.pct}% ${display.label}`;
    })
    .join(' \u00b7 ');

  // Average rank from explicit ranked-list placements
  const avgRank = computeAverageRank(mentionResults);
  const avgRankDisplay = formatAverageRankDisplay(avgRank);
  const prominenceFallback = avgRank == null ? computeProminenceFallback(mentionResults) : null;

  // Top prompts — get top 5 by mention
  const promptMentions = mentionResults
    .filter((r) => r.mentioned)
    .reduce((acc, r) => {
      const key = r.prompt.text;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const topPrompts = Object.entries(promptMentions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Top competitors from citations
  const competitorCitations = mentionResults.flatMap((r) =>
    (r.citationUrls ?? []).filter((c) => c.isCompetitor && !c.isOwnDomain)
  );
  const competitorMap = new Map<string, number>();
  for (const c of competitorCitations) {
    competitorMap.set(c.domain, (competitorMap.get(c.domain) || 0) + 1);
  }
  const topCompetitors = Array.from(competitorMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Tracked competitors from /api/competitors/list
  const [trackedCompetitors, setTrackedCompetitors] = useState<CompetitorComparisonData | null>(null);
  useEffect(() => {
    if (!domain) return;
    let cancelled = false;
    fetch(`/api/competitors/list?domain=${encodeURIComponent(domain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CompetitorComparisonData | null) => {
        if (!cancelled && data && data.competitors.length > 0) {
          setTrackedCompetitors(data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [domain]);

  // Scan freshness computation
  const domainScans = recentScans
    .filter((s) => s.url.includes(domain))
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
  const latestScanTime = domainScans[0]?.completedAt ?? domainScans[0]?.createdAt ?? null;
  const scanAgeDays = latestScanTime ? Math.floor((renderedAt - latestScanTime) / 86400000) : null;

  return (
    <div className="space-y-6">
      <OnboardingChecklist />

      {opportunityAlert && (
        <OpportunityAlertBanner
          opportunity={opportunityAlert}
          reportId={report.id}
          onSeeTraffic={() => {
            document.getElementById('tracking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {/* Scan freshness + rescan (compact, right-aligned) */}
      {onReaudit && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] text-zinc-500">
            {formatRelativeTime(latestScanTime)}
          </span>
          {scanAgeDays !== null && scanAgeDays >= 7 && (
            <span className="rounded-full bg-[#ff5252]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#ff5252]">
              Stale
            </span>
          )}
          <button
            type="button"
            onClick={onReaudit}
            disabled={reauditing}
            className="inline-flex items-center gap-1 rounded-md border border-white/8 px-2 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:border-white/16 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3 w-3', reauditing && 'animate-spin')} />
            {reauditing ? 'Scanning...' : 'Rescan'}
          </button>
        </div>
      )}

      {/* KPI Cards Row — RealGEO Style */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Visibility Score */}
        <Link href="/report" className="block">
          <DashboardPanel className="relative cursor-pointer overflow-hidden p-6 transition-all hover:border-white/16">
            <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#25c972]/10">
              <Eye className="h-4.5 w-4.5 text-[#25c972]" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Visibility Score
              <InfoTooltip text="Your overall AI visibility score (0–100). Combines discoverability, content quality, web health, and AI mentions into one number." className="ml-1 align-middle" />
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={cn('text-4xl font-bold', scoreColor(scores.aiVisibility))}>
                {scores.aiVisibility != null ? Math.round(scores.aiVisibility) : '--'}
              </span>
              <span className="text-sm text-zinc-500">%</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {scores.potentialLift != null && scores.potentialLift !== 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#25c972]/10 px-2 py-0.5 text-[11px] font-semibold text-[#25c972]">
                  <TrendingUp className="h-3 w-3" />
                  +{Math.round(scores.potentialLift)}% potential
                </span>
              )}
              {(() => {
                const prevScore = domainScans.find((s, i) => i > 0 && s.scores?.aiVisibility != null)?.scores?.aiVisibility;
                const delta = prevScore != null ? Math.round(scores.aiVisibility - prevScore) : null;
                if (delta === null || delta === 0) return null;
                return (
                  <span className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    delta > 0 ? 'bg-[#25c972]/10 text-[#25c972]' : 'bg-[#ff5252]/10 text-[#ff5252]'
                  )}>
                    {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                );
              })()}
            </div>
            {scores.aiVisibility != null && (
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(scores.aiVisibility, 100)}%`, backgroundColor: barFillColor(scores.aiVisibility) }}
                />
              </div>
            )}
            <p className="mt-2.5 text-[11px] text-zinc-500">How prominently you appear in AI answers</p>
          </DashboardPanel>
        </Link>

        {/* Average Rank */}
        <DashboardPanel className="relative overflow-hidden p-6">
          <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#3b82f6]/10">
            <Hash className="h-4.5 w-4.5 text-[#3b82f6]" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Average Rank
            <InfoTooltip text="Your average position when AI engines place your brand in a ranked list. Lower is better — #1 means you are the top-ranked recommendation. We round the display up to the nearest whole position for a cleaner, conservative score. When no numeric rank is returned, we fall back to mention prominence." className="ml-1 align-middle" />
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            {avgRankDisplay != null ? (
              <span className="text-4xl font-bold text-white">#{avgRankDisplay}</span>
            ) : prominenceFallback ? (
              <>
                <span className="text-2xl font-bold text-white">{prominenceFallback.label}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                  {prominenceFallback.strongMentionPct}% strong
                </span>
              </>
            ) : (
              <span className="text-4xl font-bold text-white">--</span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            {avgRankDisplay != null
              ? 'Across ranked AI responses'
              : prominenceFallback
                ? prominenceFallback.detail
                : 'No ranked placements detected yet'}
          </p>
          {domain && (
            <p className="mt-3 text-[11px] text-zinc-600">
              Tracking: <span className="text-zinc-400">{domain}</span>
            </p>
          )}
        </DashboardPanel>

        {/* AI Mentions */}
        <Link href="/brand" className="block">
        <DashboardPanel className={cn('relative cursor-pointer overflow-hidden p-6 transition-all hover:border-white/16', totalMentions === 0 && totalChecks === 0 && 'border-dashed')}>
          <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#a855f7]/10">
            <MessageSquare className="h-4.5 w-4.5 text-[#a855f7]" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            AI Mentions
            <InfoTooltip text="How often AI engines surface your brand in our test queries across ChatGPT, Perplexity, Gemini, and Claude." className="ml-1 align-middle" />
          </p>
          {totalMentions === 0 && totalChecks === 0 ? (
            <div className="mt-2">
              <span className="text-4xl font-bold text-zinc-600">--</span>
              <p className="mt-1.5 text-[11px] font-medium text-zinc-500">{report?.mentionSummary ? 'No prompts configured yet' : 'Awaiting first scan'}</p>
            </div>
          ) : (() => {
            const mentionPct = mentions?.overallScore != null
              ? Math.round(mentions.overallScore)
              : totalChecks > 0
                ? Math.round((totalMentions / totalChecks) * 100)
                : null;
            return mentionPct != null ? (
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{mentionPct}%</span>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  mentionPct >= 50
                    ? 'bg-[#25c972]/10 text-[#25c972]'
                    : 'bg-[#ff8a1e]/10 text-[#ff8a1e]'
                )}>
                  {mentionPct >= 50 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  mention rate
                </span>
              </div>
            ) : (
              <div className="mt-2">
                <span className="text-4xl font-bold text-white">--</span>
              </div>
            );
          })()}
          {engineBreakdown && (
            <p className="mt-3 text-[10px] leading-4 text-zinc-500">{engineBreakdown}</p>
          )}
        </DashboardPanel>
        </Link>
      </div>

      <NextStepsCard />

      {/* Platform Performance */}
      {platformCards.length > 0 ? (
        <DashboardPanel className="p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Platform Performance</p>
            <p className="mt-1 text-[13px] text-zinc-500">Real-time visibility across different AI platforms</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {platformCards.map((pc) => {
              const display = getEngineDisplay(pc.engine);
              const Icon = display.Icon;
              return (
                <div key={pc.engine} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    {Icon ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ color: display.color }}>
                        <Icon className="h-5 w-5" />
                      </span>
                    ) : (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: display.color }}
                      />
                    )}
                    <p className="text-[12px] font-semibold text-zinc-300">{display.label}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] text-zinc-500">Mentioned</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pc.pct}%`, backgroundColor: display.color }}
                      />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-end">
                    <span className={cn(
                      'text-xl font-bold tabular-nums',
                      pc.pct >= 60 ? 'text-[#25c972]' : pc.pct >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]'
                    )}>
                      {pc.pct}%
                    </span>
                    <span className="ml-2 text-[11px] text-zinc-500">visibility</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      ) : (
        <DashboardPanel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Platform Performance</p>
          <p className="mt-1.5 text-[13px] text-zinc-500">Platform breakdown appears after your first AI mention scan</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['ChatGPT', 'Perplexity', 'Gemini', 'Claude'].map((engine) => {
              const display = getEngineDisplay(engine.toLowerCase());
              const EngineIcon = display.Icon;
              return (
                <div key={engine} className="rounded-xl border border-dashed border-white/8 bg-white/[0.01] p-4">
                  <div className="flex items-center gap-2">
                    {EngineIcon ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-30" style={{ color: display.color }}>
                        <EngineIcon className="h-5 w-5" />
                      </span>
                    ) : (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full opacity-30" style={{ backgroundColor: display.color }} />
                    )}
                    <p className="text-[12px] font-semibold text-zinc-600">{engine}</p>
                  </div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.04]" />
                  <div className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-zinc-700">--</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      )}

      {/* Quick Wins */}
      <QuickWinsSection fixes={report.score.fixes ?? report.fixes ?? []} />

      {/* Two-column: Top Prompts + Competitor Rankings */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Performing Prompts */}
        <DashboardPanel className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Prompts</p>
              <h2 className="mt-1.5 text-lg font-semibold text-white">Top Performing Prompts</h2>
            </div>
            <Link
              href="/brand"
              className="mt-1 flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Manage Prompts <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {topPrompts.length > 0 ? (
              topPrompts.map(([prompt, count], i) => (
                <div key={i} className="group flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.03]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-zinc-400">{i + 1}</span>
                  <p className="min-w-0 flex-1 truncate text-[12px] text-zinc-200">{prompt}</p>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(prompt)}
                    className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-all hover:text-zinc-300 group-hover:opacity-100"
                    aria-label="Copy prompt"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <span className="shrink-0 text-[11px] font-semibold text-[#25c972]">{count}x</span>
                </div>
              ))
            ) : (
              <EmptyStateCard
                icon={MessageSquare}
                iconColor="#a855f7"
                title="No prompts tracked yet"
                description="Run a scan to see which AI prompts mention your business across ChatGPT, Perplexity, Gemini, and Claude."
                ctaLabel="View Brand & Prompts →"
                ctaHref="/brand"
                ghostRows={3}
              />
            )}
          </div>
        </DashboardPanel>

        {/* Competitor Rankings */}
        <DashboardPanel className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Competitors</p>
              <h2 className="mt-1.5 text-lg font-semibold text-white">Competitor Rankings</h2>
            </div>
            <Link
              href="/competitors"
              className="mt-1 flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {(() => {
              // Prefer tracked competitors when available
              const tracked = trackedCompetitors?.competitors.filter(
                (c) => c.status === 'complete' && c.scanData
              );

              if (tracked && tracked.length > 0) {
                const userScore = trackedCompetitors!.userBrand.overallScore;
                // Build rankings: user + completed tracked competitors, sorted by score desc
                const rankings = [
                  { domain: trackedCompetitors!.userBrand.domain, score: userScore, isUser: true },
                  ...tracked.map((c) => ({
                    domain: c.competitorDomain,
                    score: c.scanData?.overallScore ?? 0,
                    isUser: false,
                  })),
                ].sort((a, b) => b.score - a.score);

                return rankings.map((entry, i) => (
                  <div
                    key={entry.domain}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                      entry.isUser
                        ? 'border-[#25c972]/15 bg-[#25c972]/[0.04]'
                        : 'border-white/5 bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03]'
                    )}
                  >
                    <span className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      i === 0 ? 'bg-[#25c972]/15 text-[#25c972]' : 'bg-white/[0.06] text-zinc-400'
                    )}>
                      {i + 1}
                    </span>
                    <img src={getFaviconUrl(entry.domain, 32)} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-zinc-200">
                        {entry.domain}
                        {entry.isUser && (
                          <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-[#25c972]">you</span>
                        )}
                      </p>
                    </div>
                    <span className={cn('shrink-0 text-[13px] font-bold tabular-nums', scoreColor(entry.score))}>
                      {entry.score}
                    </span>
                  </div>
                ));
              }

              // Fall back to citation-detected competitors
              if (topCompetitors.length > 0) {
                return topCompetitors.map(([comp, count], i) => (
                  <div key={comp} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.03]">
                    <span className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      i === 0 ? 'bg-[#ff8a1e]/15 text-[#ff8a1e]' : 'bg-white/[0.06] text-zinc-400'
                    )}>
                      {i + 1}
                    </span>
                    <img src={getFaviconUrl(comp, 32)} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
                    <p className="min-w-0 flex-1 truncate text-[12px] text-zinc-200">{comp}</p>
                    <span className="shrink-0 text-[11px] font-semibold text-[#ff8a1e]">{count}x</span>
                  </div>
                ));
              }

              // Empty state
              return (
                <EmptyStateCard
                  icon={Users}
                  iconColor="#ff8a1e"
                  title="No competitors tracked yet"
                  description="Add competitors to compare AI visibility scores side-by-side."
                  ctaLabel="Add Competitors →"
                  ctaHref="/competitors"
                  ghostRows={3}
                />
              );
            })()}
          </div>
        </DashboardPanel>
      </div>

      {/* Prompt Analytics */}
      <PromptAnalyticsPanel domain={domain} />

      {/* Monitoring Trends */}
      <MonitoringTrendsPanel
        recentScans={recentScans}
        domain={domain}
        lastScannedAt={lastScannedAt}
        monitoringConnected={monitoringConnected}
        monitoringLoading={monitoringLoading}
        onEnableMonitoring={onEnableMonitoring}
      />

      {/* AI Crawler Traffic */}
      <div id="tracking" className="scroll-mt-6">
        <AICrawlerPanel domain={domain} trackingReady={trackingReady} trackingLastUsedAt={trackingLastUsedAt} tier={tier} />
      </div>

      {/* AI Referral Traffic */}
      <AIReferralPanel domain={domain} trackingLastUsedAt={trackingLastUsedAt} tier={tier} />

      {/* Recent Scans removed — redundant with sidebar domain list */}
    </div>
  );
}
