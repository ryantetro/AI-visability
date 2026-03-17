'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BarChart3,
  ChevronRight,
  Copy,
  Eye,
  Hash,
  MessageSquare,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { getFaviconUrl } from '@/lib/url-utils';
import { scoreColor, barFillColor } from '../lib/utils';
import { ENGINE_COLORS } from '../lib/constants';
import { MonitoringTrendsPanel } from '../panels/monitoring-trends-panel';
import { AICrawlerPanel } from '../panels/ai-crawler-panel';
import type { DashboardReportData, RecentScanData } from '../lib/types';

interface DashboardSectionProps {
  report: DashboardReportData;
  recentScans: RecentScanData[];
  domain: string;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onEnableMonitoring: () => void;
}

// Engine display config
const ENGINE_DISPLAY: Record<string, { label: string; color: string }> = {
  chatgpt: { label: 'ChatGPT', color: '#10b981' },
  perplexity: { label: 'Perplexity', color: '#3b82f6' },
  copilot: { label: 'Copilot', color: '#0ea5e9' },
  claude: { label: 'Claude', color: '#a855f7' },
  gemini: { label: 'Gemini', color: '#f59e0b' },
};

function getEngineDisplay(engine: string) {
  const key = engine.toLowerCase();
  return ENGINE_DISPLAY[key] ?? { label: engine, color: ENGINE_COLORS[key] ?? '#6b7280' };
}

export function DashboardSection({
  report,
  recentScans,
  domain,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
}: DashboardSectionProps) {
  const scores = report.score.scores;
  const mentions = report.mentionSummary;
  const [platformPeriod, setPlatformPeriod] = useState<'7d' | '30d' | '3m'>('30d');

  // Platform performance — derive from mention results
  const mentionResults = mentions?.results ?? [];
  const engineMap = new Map<string, { mentioned: number; total: number }>();
  for (const r of mentionResults) {
    const existing = engineMap.get(r.engine);
    if (existing) {
      existing.total++;
      if (r.mentioned) existing.mentioned++;
    } else {
      engineMap.set(r.engine, { mentioned: r.mentioned ? 1 : 0, total: 1 });
    }
  }
  const platformCards = Array.from(engineMap.entries()).map(([engine, stats]) => ({
    engine,
    mentioned: stats.mentioned,
    total: stats.total,
    pct: stats.total > 0 ? Math.round((stats.mentioned / stats.total) * 100) : 0,
  }));

  // Total mentions
  const totalMentions = mentionResults.filter((r) => r.mentioned).length;
  const totalChecks = mentionResults.length;

  // Build engine breakdown string
  const engineBreakdown = platformCards
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)
    .map((pc) => {
      const display = getEngineDisplay(pc.engine);
      return `${pc.pct}% ${display.label}`;
    })
    .join(' \u00b7 ');

  // Average position from citations
  const positions = mentionResults
    .flatMap((r) => (r.citationUrls ?? []).filter((c) => c.isOwnDomain).map(() => mentionResults.indexOf(r)))
    .filter((_, i) => i < 20);
  const avgRank = positions.length > 0 ? Math.round(positions.reduce((a, b) => a + b, 0) / positions.length) + 1 : null;

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

  return (
    <div className="space-y-6">
      {/* KPI Cards Row — RealGEO Style */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Visibility Score */}
        <DashboardPanel className="relative overflow-hidden p-6">
          <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#25c972]/10">
            <Eye className="h-4.5 w-4.5 text-[#25c972]" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Visibility Score</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={cn('text-4xl font-bold', scoreColor(scores.aiVisibility))}>
              {scores.aiVisibility != null ? Math.round(scores.aiVisibility) : '--'}
            </span>
            <span className="text-sm text-zinc-500">%</span>
          </div>
          {scores.potentialLift != null && scores.potentialLift !== 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#25c972]/10 px-2 py-0.5 text-[11px] font-semibold text-[#25c972]">
                <TrendingUp className="h-3 w-3" />
                +{Math.round(scores.potentialLift)}% potential
              </span>
            </div>
          )}
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

        {/* Average Rank */}
        <DashboardPanel className="relative overflow-hidden p-6">
          <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#3b82f6]/10">
            <Hash className="h-4.5 w-4.5 text-[#3b82f6]" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Average Rank</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-white">
              {avgRank != null ? `#${avgRank}` : '--'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">When mentioned by a model</p>
          {domain && (
            <p className="mt-3 text-[11px] text-zinc-600">
              Tracking: <span className="text-zinc-400">{domain}</span>
            </p>
          )}
        </DashboardPanel>

        {/* AI Mentions */}
        <DashboardPanel className="relative overflow-hidden p-6">
          <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#a855f7]/10">
            <MessageSquare className="h-4.5 w-4.5 text-[#a855f7]" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">AI Mentions</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-white">
              {totalMentions.toLocaleString()}
            </span>
            {totalChecks > 0 && (
              <span className="text-sm text-zinc-500">/ {totalChecks}</span>
            )}
          </div>
          {mentions?.overallScore != null && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                mentions.overallScore >= 50
                  ? 'bg-[#25c972]/10 text-[#25c972]'
                  : 'bg-[#ff8a1e]/10 text-[#ff8a1e]'
              )}>
                {mentions.overallScore >= 50 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.round(mentions.overallScore)}% mention rate
              </span>
            </div>
          )}
          {engineBreakdown && (
            <p className="mt-3 text-[10px] leading-4 text-zinc-500">{engineBreakdown}</p>
          )}
        </DashboardPanel>
      </div>

      {/* Platform Performance */}
      {platformCards.length > 0 && (
        <DashboardPanel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Platform Performance</p>
              <p className="mt-1 text-[13px] text-zinc-500">Real-time visibility across different AI platforms</p>
            </div>
            <div className="flex rounded-lg border border-white/[0.06] p-0.5">
              {(['7d', '30d', '3m'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatformPeriod(p)}
                  className={cn(
                    'px-3 py-1 text-[11px] font-medium rounded-md transition-colors',
                    platformPeriod === p ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {platformCards.map((pc) => {
              const display = getEngineDisplay(pc.engine);
              return (
                <div key={pc.engine} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: display.color }}
                    />
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
                  <div className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-white">{pc.mentioned}</span>
                    <span className="text-[11px] text-zinc-500">/ {pc.total}</span>
                    <span className={cn(
                      'ml-auto text-[11px] font-semibold',
                      pc.pct >= 60 ? 'text-[#25c972]' : pc.pct >= 30 ? 'text-[#ffbb00]' : 'text-[#ff5252]'
                    )}>
                      {pc.pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      )}

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
              href="/advanced?section=brand"
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
              <p className="py-6 text-center text-[12px] text-zinc-500">No prompt data yet.</p>
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
              href="/advanced?section=competitors"
              className="mt-1 flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {topCompetitors.length > 0 ? (
              topCompetitors.map(([comp, count], i) => (
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
              ))
            ) : (
              <p className="py-6 text-center text-[12px] text-zinc-500">No competitor data yet.</p>
            )}
          </div>
        </DashboardPanel>
      </div>

      {/* Monitoring Trends */}
      <MonitoringTrendsPanel
        recentScans={recentScans}
        domain={domain}
        monitoringConnected={monitoringConnected}
        monitoringLoading={monitoringLoading}
        onEnableMonitoring={onEnableMonitoring}
      />

      {/* AI Crawler Traffic */}
      <AICrawlerPanel domain={domain} />
    </div>
  );
}
