'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';
import { getFaviconUrl } from '@/lib/url-utils';
import { scoreColor, formatRelativeTime } from '../lib/utils';
import { computeAverageRank, computeProminenceFallback, formatAverageRankDisplay } from '../lib/mention-utils';
import { AI_ENGINES, getAIEngineLabel } from '@/lib/ai-engines';
import { MonitoringTrendsPanel } from '../panels/monitoring-trends-panel';
import { PromptAnalyticsPanel } from '../panels/prompt-analytics-panel';
import { AICrawlerPanel } from '../panels/ai-crawler-panel';
import { AIReferralPanel } from '../panels/ai-referral-panel';
import { EmptyStateCard } from './empty-state-card';
import { QuickWinsSection } from './quick-wins-section';
import { OpportunityAlertBanner } from './opportunity-alert-banner';
import { PromptPerformanceTable } from './prompt-performance-table';
import { PlatformBreakdown } from './platform-breakdown';
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

// ── Compact KPI tile ──────────────────────────────────────────────────────────
interface KpiTileProps {
  label: string;
  value: string;
  subValue?: string;
  delta?: number | null;
  deltaLabel?: string;
  accentColor?: string;
  href?: string;
  tooltip?: string;
}

function KpiTile({ label, value, subValue, delta, deltaLabel, accentColor = '#6b7280', href, tooltip }: KpiTileProps) {
  const inner = (
    <DashboardPanel className={cn('relative flex flex-col overflow-hidden px-4 py-3 transition-all', href && 'cursor-pointer hover:border-gray-300')}>
      {/* Thin colored top accent */}
      <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-[1.35rem]" style={{ backgroundColor: accentColor }} />
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
        {label}
        {tooltip && <InfoTooltip text={tooltip} className="ml-1 align-middle" />}
      </p>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-xl font-bold tabular-nums text-gray-900 sm:text-[1.4rem]">{value}</span>
        {delta != null && delta !== 0 && (
          <span className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
            delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          )}>
            {delta > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
      {subValue && (
        <p className="mt-0.5 text-[10px] text-gray-600">{subValue}</p>
      )}
      {deltaLabel && !delta && (
        <p className="mt-0.5 text-[10px] text-gray-600">{deltaLabel}</p>
      )}
    </DashboardPanel>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
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
        if (!cancelled) setOpportunityAlert(data?.opportunity ?? null);
      })
      .catch(() => { if (!cancelled) setOpportunityAlert(null); });
    return () => { cancelled = true; };
  }, [domain]);

  // Platform data
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

  const totalMentions = mentionResults.filter((r) => r.mentioned).length;
  const totalChecks = mentionResults.length;

  const avgRank = computeAverageRank(mentionResults);
  const avgRankDisplay = formatAverageRankDisplay(avgRank);
  const prominenceFallback = avgRank == null ? computeProminenceFallback(mentionResults) : null;

  // Competitors
  const [trackedCompetitors, setTrackedCompetitors] = useState<CompetitorComparisonData | null>(null);
  useEffect(() => {
    if (!domain) return;
    let cancelled = false;
    fetch(`/api/competitors/list?domain=${encodeURIComponent(domain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CompetitorComparisonData | null) => {
        if (!cancelled && data && data.competitors.length > 0) setTrackedCompetitors(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [domain]);

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

  // Scan freshness
  const domainScans = recentScans
    .filter((s) => s.url.includes(domain))
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
  const latestScanTime = domainScans[0]?.completedAt ?? domainScans[0]?.createdAt ?? null;
  const scanAgeDays = latestScanTime ? Math.floor((renderedAt - latestScanTime) / 86400000) : null;

  // KPI deltas vs previous scan
  const prevScan = domainScans.find((s, i) => i > 0 && s.scores?.aiVisibility != null);
  const aiDelta = prevScan ? Math.round(scores.aiVisibility - (prevScan.scores?.aiVisibility ?? 0)) : null;

  // Fixes
  const fixes = report.score.fixes ?? report.fixes ?? [];
  const totalFixLift = fixes.reduce((sum, f) => sum + f.estimatedLift, 0);

  // Mention rate
  const mentionPct = mentions?.overallScore != null
    ? Math.round(mentions.overallScore)
    : totalChecks > 0
      ? Math.round((totalMentions / totalChecks) * 100)
      : null;

  return (
    <div className="space-y-3">

      {/* ── 1. Header ── */}
      <div className="flex items-center justify-between py-0.5">
        <div>
          <h1 className="text-base font-bold tracking-tight text-gray-900 sm:text-lg">
            Welcome back
          </h1>
          <p className="mt-0.5 text-[11px] text-gray-600">
            <span className="font-medium text-gray-800">{domain}</span>
            <span className="text-gray-500"> · </span>
            {formatRelativeTime(latestScanTime)}
            {scanAgeDays !== null && scanAgeDays >= 7 && (
              <span className="ml-2 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-600">Stale</span>
            )}
          </p>
        </div>
        {onReaudit && (
          <button
            type="button"
            onClick={onReaudit}
            disabled={reauditing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3 w-3', reauditing && 'animate-spin')} />
            {reauditing ? 'Scanning…' : 'Rescan'}
          </button>
        )}
      </div>

      {/* ── 2. Opportunity Alert ── */}
      {opportunityAlert && (
        <OpportunityAlertBanner
          opportunity={opportunityAlert}
          reportId={report.id}
          onSeeTraffic={() => {
            document.getElementById('tracking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {/* ── 3. KPI strip — 5 compact tiles ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {/* Overall Score */}
        <KpiTile
          label="Overall Score"
          value={scores.overall != null ? `${Math.round(scores.overall)}` : '--'}
          subValue="Combined AI + web"
          accentColor="#6366f1"
          tooltip="Overall AI visibility score combining AI readiness, content quality, and web health."
          href="/report"
        />

        {/* AI Visibility */}
        <KpiTile
          label="AI Visibility"
          value={scores.aiVisibility != null ? `${Math.round(scores.aiVisibility)}%` : '--%'}
          delta={aiDelta}
          deltaLabel="vs. last scan"
          accentColor="#25c972"
          tooltip="How well AI engines can find and understand your content."
          href="/report"
        />

        {/* Mention Rate */}
        <KpiTile
          label="Mention Rate"
          value={mentionPct != null ? `${mentionPct}%` : '--%'}
          subValue={totalChecks > 0 ? `${totalMentions}/${totalChecks} · ${platformCards.length} platforms` : 'No prompts yet'}
          accentColor="#a855f7"
          tooltip="Percentage of AI-generated answers that mention your brand."
          href="/brand/presence"
        />

        {/* Average Rank */}
        <KpiTile
          label="Average Rank"
          value={avgRankDisplay != null ? `#${avgRankDisplay}` : prominenceFallback ? prominenceFallback.label : '--'}
          subValue={avgRankDisplay != null ? 'In ranked AI responses' : prominenceFallback ? prominenceFallback.detail : 'No ranked placements yet'}
          accentColor="#3b82f6"
          tooltip="Your average position when AI engines rank your brand. Lower is better."
        />

        {/* Potential Lift */}
        <KpiTile
          label="Potential Lift"
          value={`+${Math.round(scores.potentialLift ?? 0)} pts`}
          subValue={fixes.length > 0 ? `${fixes.length} fix${fixes.length !== 1 ? 'es' : ''} ready` : 'Fully optimized'}
          accentColor="#f59e0b"
          tooltip="Estimated score gain if all recommended fixes are applied."
        />
      </div>

      {/* ── 4. Charts row: trend (L) + platform breakdown (R) ── */}
      <div className="grid items-start gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MonitoringTrendsPanel
            recentScans={recentScans}
            domain={domain}
            lastScannedAt={lastScannedAt}
            monitoringConnected={monitoringConnected}
            monitoringLoading={monitoringLoading}
            onEnableMonitoring={onEnableMonitoring}
          />
        </div>
        <div className="lg:col-span-5">
          <PlatformBreakdown platformCards={platformCards} compact />
        </div>
      </div>

      {/* ── 5. Data row: prompt table (L) + quick wins + competitors (R) ── */}
      <div className="grid items-start gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PromptPerformanceTable
            mentionResults={mentionResults}
            domain={domain}
            hasPaidPlan={tier !== 'free'}
          />
        </div>
        <div className="flex flex-col gap-3 lg:col-span-5">
          {/* Quick Wins — compact top 3 */}
          <QuickWinsSection fixes={fixes} compact limit={3} />

          {/* Competitors panel */}
          <DashboardPanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-700">Competitors</p>
                <p className="mt-0.5 text-[11px] text-gray-600">AI visibility ranking</p>
              </div>
              <Link href="/competitors" className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-700 hover:text-gray-900">
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-3 space-y-1.5">
              {(() => {
                const tracked = trackedCompetitors?.competitors.filter(
                  (c) => c.status === 'complete' && c.scanData
                );
                if (tracked && tracked.length > 0) {
                  const userScore = trackedCompetitors!.userBrand.overallScore;
                  const rankings = [
                    { domain: trackedCompetitors!.userBrand.domain, score: userScore, isUser: true },
                    ...tracked.map((c) => ({
                      domain: c.competitorDomain,
                      score: c.scanData?.overallScore ?? 0,
                      isUser: false,
                    })),
                  ].sort((a, b) => b.score - a.score).slice(0, 5);
                  return rankings.map((entry, i) => (
                    <div
                      key={entry.domain}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                        entry.isUser
                          ? 'border-emerald-100 bg-emerald-50/50'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      )}
                    >
                      <span className={cn(
                        'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold h-[18px] w-[18px]',
                        i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                      )}>
                        {i + 1}
                      </span>
                      <img src={getFaviconUrl(entry.domain, 32)} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
                      <p className="min-w-0 flex-1 truncate text-[12px] text-gray-800">
                        {entry.domain}
                        {entry.isUser && <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-emerald-600">you</span>}
                      </p>
                      <span className={cn('shrink-0 text-[13px] font-bold tabular-nums', scoreColor(entry.score))}>
                        {entry.score}
                      </span>
                    </div>
                  ));
                }
                if (topCompetitors.length > 0) {
                  return topCompetitors.map(([comp, count], i) => (
                    <div key={comp} className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 hover:border-gray-200">
                      <span className={cn(
                        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                        i === 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                      )}>
                        {i + 1}
                      </span>
                      <img src={getFaviconUrl(comp, 32)} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
                      <p className="min-w-0 flex-1 truncate text-[12px] text-gray-800">{comp}</p>
                      <span className="shrink-0 text-[11px] font-semibold text-orange-600">{count}x</span>
                    </div>
                  ));
                }
                return (
                  <EmptyStateCard
                    icon={Users}
                    iconColor="#f59e0b"
                    title="No competitors yet"
                    description="Add competitors to compare scores side-by-side."
                    ctaLabel="Add Competitors"
                    ctaHref="/competitors"
                    ghostRows={2}
                  />
                );
              })()}
            </div>
          </DashboardPanel>
        </div>
      </div>

      {/* ── 6. Action strip ── */}
      {fixes.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-gray-900">
                {fixes.length} fix{fixes.length !== 1 ? 'es' : ''} available
              </p>
              <p className="text-[11px] text-gray-700">
                Boost your score by up to <span className="font-semibold text-blue-700">+{Math.round(totalFixLift)} pts</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => document.getElementById('fixes-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
            >
              View Fixes
            </button>
            {tier === 'free' && (
              <Link
                href="/report#fix-my-site"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Get Help <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── 7. Crawlers + referral ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div id="tracking" className="scroll-mt-6">
          <AICrawlerPanel domain={domain} trackingReady={trackingReady} trackingLastUsedAt={trackingLastUsedAt} tier={tier} />
        </div>
        <AIReferralPanel domain={domain} trackingLastUsedAt={trackingLastUsedAt} tier={tier} />
      </div>

      {/* ── 8. Prompt analytics ── */}
      <PromptAnalyticsPanel domain={domain} />
    </div>
  );
}
