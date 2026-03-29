'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { ENGINE_COLORS } from '../lib/constants';
import { EngineIcon, BrandFavicon } from './shared';
import {
  computeAverageRank,
  computeVisibilityPct,
  computeShareOfVoicePct,
  computeSentimentScore,
  deriveCompetitorLeaderboard,
  deriveSentimentBullets,
  deriveTopicPerformance,
} from '../lib/mention-utils';
import type { DashboardReportData } from '../lib/types';
import { AI_ENGINES } from '@/lib/ai-engines';
import type { CompetitorComparisonData } from '@/types/competitors';

/* ── helpers ──────────────────────────────────────────────────────────────── */

type HeroMetric = 'visibility' | 'sov' | 'sentiment';

const HERO_META: Record<HeroMetric, { label: string; description: string; accent: string; accentDim: string }> = {
  visibility: { label: 'Visibility', description: 'Percentage of AI answers that mention your brand', accent: '#25c972', accentDim: 'rgba(37,201,114,0.12)' },
  sov: { label: 'Share of Voice', description: 'Your brand mentions vs total competitor mentions', accent: '#3b82f6', accentDim: 'rgba(59,130,246,0.12)' },
  sentiment: { label: 'Sentiment', description: 'Positive sentiment ratio across AI engines', accent: '#a855f7', accentDim: 'rgba(168,85,247,0.12)' },
};

function brandAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

/* ── SVG Ring Gauge ────────────────────────────────────────────────────── */

function RingGauge({ value, size = 160, strokeWidth = 10, color }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={strokeWidth}
      />
      {/* Glow */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth + 6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        opacity={0.15}
        style={{ filter: 'blur(6px)' }}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

/* ── Custom Progress Bar ─────────────────────────────────────────────── */

function ProgressBar({ value, color, className }: { value: number; color: string; className?: string }) {
  return (
    <div className={cn('relative h-2 w-full rounded-full overflow-hidden bg-white/[0.04]', className)}>
      {/* Glow layer */}
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${Math.max(value, 2)}%`,
          background: color,
          opacity: 0.25,
          filter: 'blur(4px)',
        }}
      />
      {/* Fill */}
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${Math.max(value, 2)}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
        }}
      />
    </div>
  );
}

/* ── Engine Progress Row ─────────────────────────────────────────────── */

function EngineProgressRow({ engine, value, color }: { engine: string; value: number; color: string }) {
  return (
    <div className="group flex items-center gap-3 py-2.5">
      <div className="flex items-center gap-2.5 w-28 shrink-0">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${color}15` }}
        >
          <EngineIcon engine={engine} className="size-3.5" />
        </div>
        <span className="text-[13px] font-medium capitalize text-zinc-300">{engine}</span>
      </div>
      <div className="flex-1 min-w-0">
        <ProgressBar value={value} color={color} />
      </div>
      <span className="w-12 shrink-0 text-right text-[13px] font-semibold tabular-nums text-zinc-200">{value}%</span>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */

type MentionSummary = NonNullable<DashboardReportData['mentionSummary']>;

export function AiPresenceTab({ report, domain }: { report: DashboardReportData; domain: string }) {
  const ms = report.mentionSummary;
  const aiState = report.enrichments?.aiMentions;
  const [trackedLeaderboard, setTrackedLeaderboard] = useState<Array<{ name: string; count: number; visibilityPct: number; avgPosition: number | null; source: 'tracked' }>>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/competitors/list?domain=${encodeURIComponent(domain)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as CompetitorComparisonData;
        const tracked = data.competitors
          .filter((competitor) => competitor.status === 'complete' && competitor.scanData?.mentionSummary)
          .map((competitor) => ({
            name: competitor.competitorDomain,
            count: 0,
            visibilityPct: competitor.scanData?.mentionSummary?.visibilityPct ?? 0,
            avgPosition: competitor.scanData?.mentionSummary?.results
              ? computeAverageRank(competitor.scanData.mentionSummary.results)
              : null,
            source: 'tracked' as const,
          }))
          .sort((a, b) => b.visibilityPct - a.visibilityPct);

        if (!cancelled) {
          setTrackedLeaderboard(tracked);
        }
      } catch {
        if (!cancelled) setTrackedLeaderboard([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [domain]);

  const leaderboard = useMemo(() => {
    if (!ms) return [];

    const inferred = deriveCompetitorLeaderboard(ms);
    if (trackedLeaderboard.length === 0) return inferred;

    const seen = new Set<string>();
    const normalize = (value: string) => value.toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9]+/g, '');
    const merged: Array<{ name: string; count: number; visibilityPct: number; avgPosition: number | null; source?: 'tracked' | 'scan_inferred' | 'ai_validated' }> = [];

    for (const entry of trackedLeaderboard) {
      const key = normalize(entry.name);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }

    for (const entry of inferred) {
      const key = normalize(entry.name);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }

    return merged;
  }, [ms, trackedLeaderboard]);

  if (!ms && (aiState?.status === 'pending' || aiState?.status === 'running')) {
    return (
      <DashboardPanel className="p-5">
        <p className="text-center text-sm text-zinc-300">AI mention testing is still running for this scan.</p>
        <p className="mt-2 text-center text-sm text-zinc-500">
          {aiState?.phase === 'prompt_generation'
            ? 'Generating prompts'
            : aiState?.phase === 'engine_testing'
              ? 'Testing live AI engines'
              : aiState?.phase === 'response_analysis'
                ? 'Analyzing engine responses'
                : 'Finalizing AI visibility metrics'}
        </p>
      </DashboardPanel>
    );
  }

  if (!ms) {
    return (
      <DashboardPanel className="p-5">
        <p className="text-center text-sm text-zinc-500">No AI mention data available. Run a scan to see your AI presence metrics.</p>
      </DashboardPanel>
    );
  }

  const mentionTestingUnavailable =
    aiState?.status === 'failed' ||
    aiState?.status === 'unavailable' ||
    (ms.results?.length ?? 0) === 0 &&
    Object.values(ms.engineStatus ?? {}).some((status) => status.status === 'error');
  const mentionTestingDegraded = Boolean(aiState?.status === 'complete' && aiState?.metrics?.degraded);

  if (mentionTestingUnavailable) {
    const failingEngines = AI_ENGINES
      .filter((engine) => ms.engineStatus?.[engine]?.status === 'error')
      .map((engine) => engine);

    return (
      <DashboardPanel className="p-5">
        <p className="text-center text-sm text-zinc-300">
          AI mention testing did not finish for this scan.
        </p>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Live providers timed out or rate-limited the run, so this scan does not have a reliable AI visibility score yet.
        </p>
        {failingEngines.length > 0 && (
          <p className="mt-3 text-center text-xs text-zinc-500">
            Affected engines: {failingEngines.join(', ')}
          </p>
        )}
      </DashboardPanel>
    );
  }

  const visibilityPct = computeVisibilityPct(ms);
  const sovPct = computeShareOfVoicePct(ms);
  const sentimentScore = computeSentimentScore(ms);
  const { positives, negatives } = deriveSentimentBullets(ms, domain);
  const topics = deriveTopicPerformance(ms);

  return (
    <div className="space-y-6">
      {mentionTestingDegraded && (
        <DashboardPanel className="p-4">
          <p className="text-sm text-amber-200">
            This AI mention run completed with fallback prompts or heuristic analysis after provider slowdowns.
          </p>
        </DashboardPanel>
      )}
      <HeroSection
        ms={ms}
        visibilityPct={visibilityPct}
        sovPct={sovPct}
        sentimentScore={sentimentScore}
        leaderboard={leaderboard}
        domain={domain}
      />

      {(positives.length > 0 || negatives.length > 0) && (
        <SentimentPanel positives={positives} negatives={negatives} />
      )}

      {topics.length > 0 && (
        <TopicPerformanceSection topics={topics} />
      )}

      <PromptMetricsSection ms={ms} />

      <EngineBreakdownSection ms={ms} />
    </div>
  );
}

/* ── Hero Section ─────────────────────────────────────────────────────────── */

function HeroSection({
  ms,
  visibilityPct,
  sovPct,
  sentimentScore,
  leaderboard,
  domain,
}: {
  ms: MentionSummary;
  visibilityPct: number;
  sovPct: number;
  sentimentScore: number;
  leaderboard: Array<{ name: string; count: number; visibilityPct: number; avgPosition: number | null; source?: 'tracked' | 'scan_inferred' | 'ai_validated' }>;
  domain: string;
}) {
  const [activeMetric, setActiveMetric] = useState<HeroMetric>('visibility');
  const meta = HERO_META[activeMetric];
  const value = activeMetric === 'visibility' ? visibilityPct : activeMetric === 'sov' ? sovPct : sentimentScore;

  const chartData = useMemo(() => {
    const breakdown = ms.engineBreakdown;
    if (activeMetric === 'visibility' && breakdown) {
      return Object.entries(breakdown)
        .filter(([, v]) => v.total > 0)
        .map(([engine, v]) => ({
          name: engine,
          value: v.total > 0 ? Math.round((v.mentioned / v.total) * 100) : 0,
          color: ENGINE_COLORS[engine] ?? '#71717a',
        }))
        .sort((a, b) => b.value - a.value);
    }
    if (activeMetric === 'sov') {
      const sovByEngine = ms.shareOfVoice?.byEngine;
      if (sovByEngine) {
        return Object.entries(sovByEngine)
          .map(([engine, v]) => ({
            name: engine,
            value: v.sovPct,
            color: ENGINE_COLORS[engine] ?? '#71717a',
          }))
          .sort((a, b) => b.value - a.value);
      }
      return leaderboard.slice(0, 6).map((c) => ({
        name: c.name.length > 14 ? c.name.slice(0, 12) + '..' : c.name,
        value: c.visibilityPct,
        color: brandAvatarColor(c.name),
      }));
    }
    if (activeMetric === 'sentiment' && breakdown) {
      const results = ms.results ?? [];
      return AI_ENGINES
        .filter((e) => breakdown[e].total > 0)
        .map((engine) => {
          const engineResults = results.filter((r) => r.engine === engine && r.mentioned && r.sentiment);
          const posCount = engineResults.filter((r) => r.sentiment === 'positive').length;
          const total = engineResults.length;
          return {
            name: engine,
            value: total > 0 ? Math.round((posCount / total) * 100) : 0,
            color: ENGINE_COLORS[engine] ?? '#71717a',
          };
        })
        .sort((a, b) => b.value - a.value);
    }
    return [];
  }, [activeMetric, ms, leaderboard]);

  const allBrands = useMemo(() => {
    const brandEntry: { name: string; visibilityPct: number; avgPosition: number | null; source?: 'tracked' | 'scan_inferred' | 'ai_validated'; isBrand: boolean } = {
      name: domain,
      visibilityPct,
      avgPosition: null,
      isBrand: true,
    };
    const entries = [
      brandEntry,
      ...leaderboard.slice(0, 19).map((e) => ({ ...e, isBrand: false })),
    ].sort((a, b) => b.visibilityPct - a.visibilityPct);
    return entries;
  }, [leaderboard, domain, visibilityPct]);

  return (
    <DashboardPanel className="p-0 overflow-hidden">
      {/* Header bar with toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
        <SectionTitle eyebrow="AI Presence" title="Brand Overview" description="Toggle metrics to explore your AI visibility, share of voice, and sentiment." />
        <div className="flex gap-0.5 rounded-xl bg-white/[0.03] p-1 border border-white/[0.04]">
          {(Object.keys(HERO_META) as HeroMetric[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveMetric(key)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200',
                activeMetric === key
                  ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.06]'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              )}
            >
              {HERO_META[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        {/* Left: Ring gauge + engine bars */}
        <div className="px-6 pb-6">
          {/* KPI with ring gauge */}
          <div className="flex items-center gap-6 mb-6">
            <div className="relative shrink-0">
              <RingGauge value={value} size={120} strokeWidth={8} color={meta.accent} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums text-white">{value}</span>
                <span className="text-[11px] font-medium text-zinc-500">%</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-200">{meta.label}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">{meta.description}</p>
              <div className="mt-2.5 flex items-center gap-1.5">
                {value >= 50 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[#25c972]" />
                ) : value >= 25 ? (
                  <Minus className="h-3.5 w-3.5 text-[#ffbb00]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[#ff5252]" />
                )}
                <span className={cn(
                  'text-[12px] font-medium',
                  value >= 50 ? 'text-[#25c972]' : value >= 25 ? 'text-[#ffbb00]' : 'text-[#ff5252]'
                )}>
                  {value >= 50 ? 'Strong' : value >= 25 ? 'Moderate' : 'Needs work'}
                </span>
              </div>
            </div>
          </div>

          {/* Engine progress bars */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">By Engine</p>
              {chartData.map((entry) => (
                <EngineProgressRow
                  key={entry.name}
                  engine={entry.name}
                  value={entry.value}
                  color={entry.color}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Brand Leaderboard */}
        <div className="border-t border-white/[0.04] lg:border-t-0 lg:border-l lg:border-white/[0.04] px-6 pb-6 pt-5 lg:pt-0">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Brand Rankings</p>
          {!ms.competitorDiscovery ? (
            <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[12px] text-zinc-400">
              Competitor data needs refresh. Run a new scan to see validated competitors.
            </div>
          ) : (
            <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[12px] text-zinc-400">
              Only high-confidence competitors shown. We prefer fewer real brands over filler entries.
            </div>
          )}
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] overflow-hidden">
            <div className="max-h-[340px] overflow-y-auto">
              {allBrands.map((entry, i) => (
                <div
                  key={entry.name}
                  className={cn(
                    'flex items-center justify-between px-4 py-2.5 text-[13px] border-b border-white/[0.03] last:border-b-0 transition-colors',
                    entry.isBrand ? 'bg-[#25c972]/[0.06]' : 'hover:bg-white/[0.02]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold tabular-nums',
                      i === 0 ? 'bg-[#fbbf24]/15 text-[#fbbf24]' :
                      i === 1 ? 'bg-white/[0.06] text-zinc-300' :
                      i === 2 ? 'bg-[#cd7f32]/15 text-[#cd7f32]' :
                      'text-zinc-600'
                    )}>
                      {i + 1}
                    </span>
                    <BrandFavicon name={entry.name} size={18} />
                    <span className="truncate text-zinc-300">
                      {entry.name}
                      {entry.isBrand && (
                        <span className="ml-2 inline-flex items-center rounded-md bg-[#25c972]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#25c972]">YOU</span>
                      )}
                      {!entry.isBrand && entry.source && (
                        <span className="ml-2 inline-flex items-center rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                          {entry.source === 'tracked' ? 'Tracked' : entry.source === 'scan_inferred' ? 'Scan' : 'AI'}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:block w-20">
                      <ProgressBar value={entry.visibilityPct} color={entry.isBrand ? '#25c972' : 'rgba(255,255,255,0.2)'} className="h-1" />
                    </div>
                    <span className="w-10 text-right tabular-nums font-medium text-zinc-200">{entry.visibilityPct}%</span>
                  </div>
                </div>
              ))}
              {!ms.competitorDiscovery && allBrands.length === 1 && (
                <div className="px-4 py-4 text-[12px] text-zinc-500">
                  Brand rankings are hidden for older scans until the site is rescanned with validated competitor discovery.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}

/* ── Sentiment Panel — Prose Cards ────────────────────────────────────────── */

function SentimentPanel({ positives, negatives }: { positives: string[]; negatives: string[] }) {
  const positiveProse = positives.length > 0
    ? positives.map((p) => p.endsWith('.') ? p : p + '.').join(' ')
    : null;
  const negativeProse = negatives.length > 0
    ? negatives.map((n) => n.endsWith('.') ? n : n + '.').join(' ')
    : null;

  return (
    <DashboardPanel className="p-5">
      <SectionTitle eyebrow="Sentiment" title="Sentiment Analysis" description="What AI engines say about your brand — strengths and areas for improvement." />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#25c972]/10 bg-[#25c972]/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25c972]/15">
              <ThumbsUp className="h-4 w-4 text-[#25c972]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#25c972]">Strengths</p>
              <p className="text-[11px] text-zinc-500">What AI says you do well</p>
            </div>
          </div>
          {positiveProse ? (
            <p className="text-[13px] leading-relaxed text-zinc-300">{positiveProse}</p>
          ) : (
            <p className="text-[13px] text-zinc-500 italic">No positive signals extracted yet.</p>
          )}
        </div>
        <div className="rounded-xl border border-[#ff5252]/10 bg-[#ff5252]/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff5252]/15">
              <ThumbsDown className="h-4 w-4 text-[#ff5252]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#ff5252]">Weaknesses</p>
              <p className="text-[11px] text-zinc-500">Areas for improvement</p>
            </div>
          </div>
          {negativeProse ? (
            <p className="text-[13px] leading-relaxed text-zinc-300">{negativeProse}</p>
          ) : (
            <p className="text-[13px] text-zinc-500 italic">No negative signals found — great job!</p>
          )}
        </div>
      </div>
    </DashboardPanel>
  );
}

/* ── Topic Performance ─────────────────────────────────────────────────── */

function TopicPerformanceSection({ topics }: { topics: Array<{ topic: string; visibilityPct: number; shareOfVoice: number; topBrands: string[]; promptCount: number }> }) {
  return (
    <DashboardPanel className="p-5">
      <SectionTitle eyebrow="Topics" title="Topic Performance" description="How your brand performs across different conversation topics." />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
              <th className="pb-2.5 pr-3">Topic</th>
              <th className="pb-2.5 pr-3 text-right" title="Percentage of AI responses that mention your brand for this topic">Visibility</th>
              <th className="pb-2.5 pr-3 text-right" title="Your brand's share of all brand mentions for this topic">Share of Voice</th>
              <th className="pb-2.5 pr-3">Top Brands</th>
              <th className="pb-2.5 text-right text-zinc-600">Prompts</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.topic} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                <td className="py-3.5 pr-3 text-zinc-200">{t.topic}</td>
                <td className="py-3.5 pr-3 text-right tabular-nums">
                  <span className={cn(
                    'inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold',
                    t.visibilityPct >= 70 ? 'bg-[#25c972]/10 text-[#25c972]' :
                    t.visibilityPct >= 40 ? 'bg-[#ffbb00]/10 text-[#ffbb00]' :
                    'bg-[#ff5252]/10 text-[#ff5252]'
                  )}>
                    {t.visibilityPct}%
                  </span>
                </td>
                <td className="py-3.5 pr-3 text-right tabular-nums text-zinc-300">{t.shareOfVoice}%</td>
                <td className="py-3.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    {t.topBrands.slice(0, 3).map((b) => (
                      <div key={b} className="flex items-center gap-1.5" title={b}>
                        <BrandFavicon name={b} size={20} />
                        <span className="text-[11px] text-zinc-400 hidden sm:inline">{b.length > 12 ? b.slice(0, 10) + '..' : b}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 text-right tabular-nums text-zinc-500">{t.promptCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}

/* ── Prompt Metrics ────────────────────────────────────────────────────── */

function PromptMetricsSection({ ms }: { ms: MentionSummary }) {
  const results = ms.results ?? [];
  const prompts = ms.promptsUsed ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (prompts.length === 0) return null;

  const engines = AI_ENGINES;

  const promptRows = prompts.map((prompt) => {
    const promptResults = results.filter((r) => r.prompt.id === prompt.id);
    const mentionedCount = promptResults.filter((r) => r.mentioned).length;
    const totalEngines = promptResults.length;
    const visibilityPct = totalEngines > 0 ? Math.round((mentionedCount / totalEngines) * 100) : 0;

    const sentiments = promptResults.filter((r) => r.sentiment).map((r) => r.sentiment!);
    const dominantSentiment = sentiments.length > 0
      ? (['positive', 'neutral', 'negative'] as const).reduce((a, b) =>
          sentiments.filter((s) => s === a).length >= sentiments.filter((s) => s === b).length ? a : b
        )
      : null;
    const sentimentPct = sentiments.length > 0
      ? Math.round((sentiments.filter((s) => s === dominantSentiment).length / sentiments.length) * 100)
      : null;

    return {
      prompt,
      promptResults,
      mentionedCount,
      totalEngines,
      visibilityPct,
      dominantSentiment,
      sentimentPct,
      topic: prompt.topic ?? prompt.category,
    };
  });

  return (
    <DashboardPanel className="p-5">
      <SectionTitle eyebrow="Prompts" title="Prompt Metrics" description="Detailed per-prompt breakdown across AI engines." />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
              <th className="pb-2.5 pr-3 w-8"></th>
              <th className="pb-2.5 pr-3">Prompt</th>
              <th className="pb-2.5 pr-3">Topic</th>
              <th className="pb-2.5 pr-3 text-right">Visibility</th>
              <th className="pb-2.5 text-right">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {promptRows.map((row) => {
              const isExpanded = expandedId === row.prompt.id;
              return (
                <TablePromptRow
                  key={row.prompt.id}
                  row={row}
                  isExpanded={isExpanded}
                  engines={engines}
                  onToggle={() => setExpandedId(isExpanded ? null : row.prompt.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}

function TablePromptRow({
  row,
  isExpanded,
  engines,
  onToggle,
}: {
  row: {
    prompt: { id: string; text: string; category: string; topic?: string };
    promptResults: Array<{ engine: string; mentioned: boolean; sentiment?: 'positive' | 'neutral' | 'negative' | null; position?: number | null; testedAt?: number }>;
    visibilityPct: number;
    dominantSentiment: 'positive' | 'neutral' | 'negative' | null;
    sentimentPct: number | null;
    topic: string;
  };
  isExpanded: boolean;
  engines: readonly string[];
  onToggle: () => void;
}) {
  const sentimentPillColors = {
    positive: 'bg-[#25c972]/10 text-[#25c972]',
    neutral: 'bg-[#ffbb00]/10 text-[#ffbb00]',
    negative: 'bg-[#ff5252]/10 text-[#ff5252]',
  };

  const lastRun = row.promptResults.reduce((max, r) => Math.max(max, r.testedAt ?? 0), 0);

  return (
    <>
      <tr
        className={cn('border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.015] transition-colors', isExpanded && 'bg-white/[0.02]')}
        onClick={onToggle}
      >
        <td className="py-3.5 pr-2">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />}
        </td>
        <td className="py-3.5 pr-3 max-w-[280px]">
          <p className="truncate text-zinc-200">{row.prompt.text}</p>
        </td>
        <td className="py-3.5 pr-3">
          <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{row.topic}</span>
        </td>
        <td className="py-3.5 pr-3 text-right">
          <p className="text-[13px] font-bold tabular-nums text-zinc-200">{row.visibilityPct}%</p>
        </td>
        <td className="py-3.5 text-right">
          {row.dominantSentiment && row.sentimentPct != null ? (
            <span className={cn(
              'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums',
              sentimentPillColors[row.dominantSentiment]
            )}>
              {row.sentimentPct}% {row.dominantSentiment}
            </span>
          ) : (
            <span className="text-zinc-600">--</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-white/[0.03]">
          <td colSpan={5} className="px-4 py-3 bg-white/[0.01]">
            <div className="flex flex-wrap gap-2">
              {engines.map((engine) => {
                const er = row.promptResults.find((r) => r.engine === engine);
                const engineColor = ENGINE_COLORS[engine] ?? '#71717a';
                if (!er) return (
                  <span key={engine} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-1.5 text-[11px] text-zinc-600">
                    <EngineIcon engine={engine} className="size-3.5" />
                    <span className="capitalize">{engine}</span> — not tested
                  </span>
                );
                return (
                  <span
                    key={engine}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px]"
                    style={{
                      borderColor: er.mentioned ? `${engineColor}25` : 'rgba(255,82,82,0.15)',
                      background: er.mentioned ? `${engineColor}08` : 'rgba(255,82,82,0.04)',
                      color: er.mentioned ? engineColor : '#ff5252',
                    }}
                  >
                    <EngineIcon engine={engine} className="size-3.5" />
                    <span className="capitalize font-medium">{engine}</span>
                    {er.mentioned ? ' — mentioned' : ' — not found'}
                    {er.mentioned && er.position != null && ` (#${er.position})`}
                  </span>
                );
              })}
            </div>
            {lastRun > 0 && (
              <p className="mt-2 text-[10px] text-zinc-600">
                Last tested: {new Date(lastRun).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Engine Breakdown — Ring Gauges ────────────────────────────────────── */

function EngineBreakdownSection({ ms }: { ms: MentionSummary }) {
  const breakdown = ms.engineBreakdown;
  if (!breakdown) return null;

  const data = Object.entries(breakdown)
    .filter(([, v]) => v.total > 0)
    .map(([engine, v]) => ({
      engine,
      mentionRate: v.total > 0 ? Math.round((v.mentioned / v.total) * 100) : 0,
      mentioned: v.mentioned,
      total: v.total,
    }))
    .sort((a, b) => b.mentionRate - a.mentionRate);

  if (data.length === 0) return null;

  return (
    <DashboardPanel className="p-5">
      <SectionTitle eyebrow="Engines" title="Engine Breakdown" description="Mention rate across each AI engine." />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.map((entry) => {
          const color = ENGINE_COLORS[entry.engine] ?? '#71717a';
          return (
            <div
              key={entry.engine}
              className="group relative flex flex-col items-center rounded-xl border border-white/[0.05] bg-white/[0.015] p-5 transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.025]"
            >
              {/* Subtle glow on hover */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 30%, ${color}08, transparent 70%)` }}
              />

              {/* Ring gauge */}
              <div className="relative mb-4">
                <RingGauge value={entry.mentionRate} size={88} strokeWidth={6} color={color} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: `${color}12` }}
                  >
                    <EngineIcon engine={entry.engine} className="size-5" />
                  </div>
                </div>
              </div>

              {/* Engine name */}
              <p className="text-[13px] font-semibold capitalize text-zinc-200">{entry.engine}</p>

              {/* Percentage */}
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">{entry.mentionRate}%</p>

              <p className="mt-1 text-[11px] text-zinc-500">
                Live engine testing
              </p>
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}
