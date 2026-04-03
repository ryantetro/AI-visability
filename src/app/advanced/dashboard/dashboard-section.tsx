'use client';

import { useEffect, useState } from 'react';
import { CollapsibleSection } from '@/components/app/dashboard-primitives';
import { AI_ENGINES } from '@/lib/ai-engines';
import { OnboardingChecklist } from '@/components/app/onboarding-checklist';
import { OpportunityAlertBanner } from './opportunity-alert-banner';
import { ScoreHeader } from './score-header';
import { ActionCenter } from './action-center';
import { PromptRankingsTable } from './prompt-rankings-table';
import { PlatformSnapshot } from './platform-snapshot';
import { MonitoringTrendsPanel } from '../panels/monitoring-trends-panel';
import { PromptAnalyticsPanel } from '../panels/prompt-analytics-panel';
import { AICrawlerPanel } from '../panels/ai-crawler-panel';
import { AIReferralPanel } from '../panels/ai-referral-panel';
import { usePlan } from '@/hooks/use-plan';
import type { DashboardReportData, RecentScanData } from '../lib/types';
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
  const { tier, maxCompetitors } = usePlan();
  const [renderedAt] = useState(() => Date.now());

  // Tracking key + last signal (shared by crawler & referral panels)
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
      .catch(() => {
        if (!cancelled) setOpportunityAlert(null);
      });
    return () => { cancelled = true; };
  }, [domain]);

  // Derived data
  const mentionResults = mentions?.results ?? [];
  const totalMentions = mentionResults.filter((r) => r.mentioned).length;
  const totalChecks = mentionResults.length;
  const fixes = report.score.fixes ?? report.fixes ?? [];

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

  // Scan freshness
  const domainScans = recentScans
    .filter((s) => s.url.includes(domain))
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
  const latestScanTime = domainScans[0]?.completedAt ?? domainScans[0]?.createdAt ?? null;
  const scanAgeDays = latestScanTime ? Math.floor((renderedAt - latestScanTime) / 86400000) : null;

  return (
    <div className="space-y-6">
      {/* Onboarding (shown for new users only) */}
      <OnboardingChecklist />

      {/* Opportunity Alert Banner */}
      {opportunityAlert && (
        <OpportunityAlertBanner
          opportunity={opportunityAlert}
          reportId={report.id}
          onSeeTraffic={() => {
            document.getElementById('tracking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {/* ── Zone 1: Score Header ── */}
      <ScoreHeader
        scores={scores}
        mentionResults={mentionResults}
        overallScore={mentions?.overallScore ?? null}
        totalMentions={totalMentions}
        totalChecks={totalChecks}
        domainScans={domainScans}
        latestScanTime={latestScanTime}
        scanAgeDays={scanAgeDays}
        onReaudit={onReaudit}
        reauditing={reauditing}
      />

      {/* ── Zone 2: Action Center ── */}
      <ActionCenter
        fixes={fixes}
        monitoringConnected={monitoringConnected}
        trackingReady={trackingReady}
        tier={tier}
        maxCompetitors={maxCompetitors}
      />

      {/* ── Zone 3: Prompt Rankings Table ── */}
      <PromptRankingsTable mentionResults={mentionResults} />

      {/* ── Zone 4: Platform Snapshot ── */}
      <PlatformSnapshot platformCards={platformCards} />

      {/* ── Zone 5: Analytics & Monitoring (below fold, collapsible) ── */}
      <CollapsibleSection title="Analytics & Monitoring" defaultOpen={false}>
        <div className="space-y-4 p-4">
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
        </div>
      </CollapsibleSection>
    </div>
  );
}
