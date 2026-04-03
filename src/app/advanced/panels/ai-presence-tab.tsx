'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

type MentionSummary = NonNullable<DashboardReportData['mentionSummary']>;

function brandAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

/* ── Progress Bar ────────────────────────────────────────────────────────── */

function ProgressBar({ value, color, height = 'h-2' }: { value: number; color: string; height?: string }) {
  return (
    <div className={cn('relative w-full rounded-full overflow-hidden bg-gray-100', height)}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.max(value, 2)}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
      />
    </div>
  );
}

/* ── Engine Bar Row ──────────────────────────────────────────────────────── */

function EngineBarRow({
  engine, value, color, total, active, onClick,
}: {
  engine: string; value: number; color: string; total: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
        active ? 'bg-gray-100' : 'hover:bg-gray-50'
      )}
    >
      <div className="flex w-28 shrink-0 items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${color}15` }}>
          <EngineIcon engine={engine} className="size-3.5" />
        </div>
        <span className="text-[13px] font-medium capitalize text-gray-700">{engine}</span>
      </div>
      <div className="flex-1 min-w-0">
        <ProgressBar value={value} color={color} height="h-2.5" />
      </div>
      <span className="w-8 shrink-0 text-right text-[13px] font-bold tabular-nums text-gray-800">{value}</span>
    </button>
  );
}

/* ── Stat Strip ──────────────────────────────────────────────────────────── */

function StatStrip({ opportunity, mentions, sov }: { opportunity: number; mentions: number; sov: number }) {
  const stats = [
    { label: 'Opportunity', value: opportunity, suffix: '%', color: 'text-amber-600', bg: 'bg-amber-50', description: 'Prompts where you could rank higher' },
    { label: 'Mentions You', value: mentions, suffix: '%', color: 'text-blue-600', bg: 'bg-blue-50', description: 'AI answers that include your brand' },
    { label: 'Share of Voice', value: sov, suffix: '%', color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Your share vs all brand mentions' },
  ];

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-200">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={cn(
            'flex flex-col items-center justify-center px-4 py-4 text-center',
            i < stats.length - 1 && 'border-r border-gray-200'
          )}
        >
          <span className={cn('text-[11px] font-semibold uppercase tracking-[0.14em]', stat.color)}>
            {stat.label}
          </span>
          <span className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
            {stat.value}<span className="text-base font-semibold text-gray-600">{stat.suffix}</span>
          </span>
          <span className="mt-0.5 hidden text-[10px] text-gray-600 sm:block">{stat.description}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */

export function AiPresenceTab({ report, domain }: { report: DashboardReportData; domain: string }) {
  const ms = report.mentionSummary;
  const aiState = report.enrichments?.aiMentions;
  const [activeEngine, setActiveEngine] = useState<string | null>(null);
  const [trackedLeaderboard, setTrackedLeaderboard] = useState<Array<{
    name: string; count: number; visibilityPct: number; avgPosition: number | null; source: 'tracked';
  }>>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/competitors/list?domain=${encodeURIComponent(domain)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as CompetitorComparisonData;
        const tracked = data.competitors
          .filter((c) => c.status === 'complete' && c.scanData?.mentionSummary)
          .map((c) => ({
            name: c.competitorDomain,
            count: 0,
            visibilityPct: c.scanData?.mentionSummary?.visibilityPct ?? 0,
            avgPosition: c.scanData?.mentionSummary?.results
              ? computeAverageRank(c.scanData.mentionSummary.results)
              : null,
            source: 'tracked' as const,
          }))
          .sort((a, b) => b.visibilityPct - a.visibilityPct);
        if (!cancelled) setTrackedLeaderboard(tracked);
      } catch {
        if (!cancelled) setTrackedLeaderboard([]);
      }
    })();
    return () => { cancelled = true; };
  }, [domain]);

  const leaderboard = useMemo(() => {
    if (!ms) return [];
    const inferred = deriveCompetitorLeaderboard(ms);
    if (trackedLeaderboard.length === 0) return inferred;
    const seen = new Set<string>();
    const normalize = (v: string) => v.toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9]+/g, '');
    const merged: Array<{ name: string; count: number; visibilityPct: number; avgPosition: number | null; source?: string; isBrand?: boolean }> = [];
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

  // Loading / no-data states
  if (!ms && (aiState?.status === 'pending' || aiState?.status === 'running')) {
    return (
      <DashboardPanel className="p-5">
        <p className="text-center text-sm text-gray-700">AI mention testing is still running for this scan.</p>
        <p className="mt-2 text-center text-sm text-gray-600">
          {aiState?.phase === 'prompt_generation' ? 'Generating prompts'
            : aiState?.phase === 'engine_testing' ? 'Testing live AI engines'
            : aiState?.phase === 'response_analysis' ? 'Analyzing engine responses'
            : 'Finalizing AI visibility metrics'}
        </p>
      </DashboardPanel>
    );
  }

  if (!ms) {
    return (
      <DashboardPanel className="p-5">
        <p className="text-center text-sm text-gray-600">No AI mention data available. Run a scan to see your AI presence metrics.</p>
      </DashboardPanel>
    );
  }

  const mentionTestingUnavailable =
    aiState?.status === 'failed' ||
    aiState?.status === 'unavailable' ||
    ((ms.results?.length ?? 0) === 0 &&
      Object.values(ms.engineStatus ?? {}).some((s) => s.status === 'error'));

  if (mentionTestingUnavailable) {
    const failingEngines = AI_ENGINES.filter((e) => ms.engineStatus?.[e]?.status === 'error');
    return (
      <DashboardPanel className="p-5">
        <p className="text-center text-sm text-gray-700">AI mention testing did not finish for this scan.</p>
        <p className="mt-2 text-center text-sm text-gray-600">Live providers timed out or rate-limited the run.</p>
        {failingEngines.length > 0 && (
          <p className="mt-3 text-center text-xs text-gray-600">Affected engines: {failingEngines.join(', ')}</p>
        )}
      </DashboardPanel>
    );
  }

  const visibilityPct = computeVisibilityPct(ms);
  const sovPct = computeShareOfVoicePct(ms);
  const sentimentScore = computeSentimentScore(ms);
  const opportunityPct = Math.max(0, 100 - visibilityPct);
  const { positives, negatives } = deriveSentimentBullets(ms, domain);
  const topics = deriveTopicPerformance(ms);

  // Engine bar data
  const breakdown = ms.engineBreakdown;
  const engineBars = breakdown
    ? Object.entries(breakdown)
        .filter(([, v]) => v.total > 0)
        .map(([engine, v]) => ({
          engine,
          value: v.total > 0 ? Math.round((v.mentioned / v.total) * 100) : 0,
          rawCount: v.mentioned,
          total: v.total,
          color: ENGINE_COLORS[engine] ?? '#71717a',
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  // All brands for leaderboard
  const allBrands = useMemo(() => {
    const brandEntry = { name: domain, visibilityPct, avgPosition: null, source: undefined, isBrand: true };
    return [brandEntry, ...leaderboard.slice(0, 19).map((e) => ({ ...e, isBrand: false }))].sort((a, b) => b.visibilityPct - a.visibilityPct);
  }, [leaderboard, domain, visibilityPct]);

  const mentionTestingDegraded = Boolean(aiState?.status === 'complete' && aiState?.metrics?.degraded);

  return (
    <div className="space-y-4">
      {mentionTestingDegraded && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[13px] text-amber-700">
            This AI mention run completed with fallback prompts or heuristic analysis after provider slowdowns.
          </p>
        </div>
      )}

      {/* ── Two-panel row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Left: Engine bars */}
        <DashboardPanel className="p-0 overflow-hidden">
          <div className="flex items-start justify-between px-5 pt-5 pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Top AI Engines</p>
              <p className="mt-0.5 text-[13px] text-gray-600">Click to filter by engine</p>
            </div>
            {activeEngine && (
              <button
                type="button"
                onClick={() => setActiveEngine(null)}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="px-2 pb-3">
            {engineBars.length > 0 ? engineBars.map((bar) => (
              <EngineBarRow
                key={bar.engine}
                engine={bar.engine}
                value={bar.value}
                color={bar.color}
                total={bar.total}
                active={activeEngine === bar.engine}
                onClick={() => setActiveEngine((prev) => prev === bar.engine ? null : bar.engine)}
              />
            )) : (
              <p className="px-3 py-4 text-[13px] text-gray-500">No engine data available.</p>
            )}
          </div>
        </DashboardPanel>

        {/* Right: Brand rankings */}
        <DashboardPanel className="p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Brand Rankings</p>
            <p className="mt-0.5 text-[13px] text-gray-600">Competitive visibility comparison</p>
          </div>
          {!ms.competitorDiscovery && allBrands.length <= 1 ? (
            <div className="px-5 pb-4 text-[12px] text-gray-500">
              Run a new scan to see validated competitor rankings.
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {allBrands.map((entry, i) => (
                <div
                  key={entry.name}
                  className={cn(
                    'flex items-center gap-3 border-t border-gray-100 px-5 py-2.5 transition-colors',
                    entry.isBrand ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                  )}
                >
                  <span className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums',
                    i === 0 ? 'bg-amber-100 text-amber-600'
                    : i === 1 ? 'bg-gray-100 text-gray-600'
                    : i === 2 ? 'bg-orange-100 text-orange-500'
                    : 'text-gray-500'
                  )}>
                    {i + 1}
                  </span>
                  <BrandFavicon name={entry.name} size={18} />
                  <span className="flex-1 truncate text-[13px] text-gray-700">
                    {entry.name}
                    {entry.isBrand && (
                      <span className="ml-2 inline-flex items-center rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">YOU</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden w-16 sm:block">
                      <ProgressBar value={entry.visibilityPct} color={entry.isBrand ? '#3b82f6' : '#94a3b8'} height="h-1.5" />
                    </div>
                    <span className="w-9 text-right text-[12px] font-semibold tabular-nums text-gray-700">{entry.visibilityPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>

      {/* ── Stat strip ── */}
      <StatStrip opportunity={opportunityPct} mentions={visibilityPct} sov={sovPct} />

      {/* ── Prompt table ── */}
      <PromptMetricsSection ms={ms} activeEngine={activeEngine} />

      {/* ── Sentiment ── */}
      {(positives.length > 0 || negatives.length > 0) && (
        <SentimentPanel positives={positives} negatives={negatives} />
      )}

      {/* ── Topic performance ── */}
      {topics.length > 0 && <TopicPerformanceSection topics={topics} />}

      {/* ── Engine breakdown ── */}
      <EngineBreakdownSection ms={ms} sentimentScore={sentimentScore} />
    </div>
  );
}

/* ── Prompt Metrics ────────────────────────────────────────────────────── */

function PromptMetricsSection({ ms, activeEngine }: { ms: MentionSummary; activeEngine: string | null }) {
  const results = ms.results ?? [];
  const prompts = ms.promptsUsed ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (prompts.length === 0) return null;

  const engines = AI_ENGINES;

  const promptRows = prompts.map((prompt) => {
    let promptResults = results.filter((r) => r.prompt.id === prompt.id);
    if (activeEngine) promptResults = promptResults.filter((r) => r.engine === activeEngine);

    const mentionedCount = promptResults.filter((r) => r.mentioned).length;
    const totalEngines = promptResults.length;
    const visibilityPct = totalEngines > 0 ? Math.round((mentionedCount / totalEngines) * 100) : 0;

    const sentiments = promptResults.filter((r) => r.sentiment).map((r) => r.sentiment!);
    const dominantSentiment = sentiments.length > 0
      ? (['positive', 'neutral', 'negative'] as const).reduce((a, b) =>
          sentiments.filter((s) => s === a).length >= sentiments.filter((s) => s === b).length ? a : b)
      : null;
    const sentimentPct = sentiments.length > 0
      ? Math.round((sentiments.filter((s) => s === dominantSentiment).length / sentiments.length) * 100)
      : null;

    // Top LLM = the engine with the highest mention for this prompt
    const topEngine = engines.reduce<{ engine: string; color: string } | null>((best, engine) => {
      const r = results.find((res) => res.prompt.id === prompt.id && res.engine === engine && res.mentioned);
      return r ? (best ?? { engine, color: ENGINE_COLORS[engine] ?? '#71717a' }) : best;
    }, null);

    return {
      prompt,
      promptResults,
      mentionedCount,
      totalEngines,
      visibilityPct,
      dominantSentiment,
      sentimentPct,
      topEngine,
      topic: prompt.topic ?? prompt.category,
    };
  });

  return (
    <DashboardPanel className="overflow-hidden p-0">
      {/* Table header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-[13px] font-semibold text-gray-900">Prompt Performance Overview</p>
          <p className="text-[11px] text-gray-500">Visibility of your brand across AI-generated answers</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {activeEngine && (
        <div className="border-b border-gray-100 bg-blue-50/60 px-5 py-2">
          <p className="text-[11px] text-blue-700">
            Filtered by <span className="font-semibold capitalize">{activeEngine}</span>
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              <th className="py-3 pl-5 pr-3 w-8"></th>
              <th className="py-3 pr-3">Prompt</th>
              <th className="py-3 pr-3">Top LLM</th>
              <th className="py-3 pr-3 text-right">Visibility Score</th>
              <th className="py-3 pr-5 text-right">Sentiment</th>
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
  row, isExpanded, engines, onToggle,
}: {
  row: {
    prompt: { id: string; text: string; category: string; topic?: string };
    promptResults: Array<{ engine: string; mentioned: boolean; sentiment?: 'positive' | 'neutral' | 'negative' | null; position?: number | null; testedAt?: number }>;
    visibilityPct: number;
    dominantSentiment: 'positive' | 'neutral' | 'negative' | null;
    sentimentPct: number | null;
    topEngine: { engine: string; color: string } | null;
    topic: string;
  };
  isExpanded: boolean;
  engines: readonly string[];
  onToggle: () => void;
}) {
  const visColor = row.visibilityPct >= 70 ? 'text-emerald-600 bg-emerald-50'
    : row.visibilityPct >= 40 ? 'text-amber-600 bg-amber-50'
    : 'text-red-500 bg-red-50';

  const lastRun = row.promptResults.reduce((max, r) => Math.max(max, r.testedAt ?? 0), 0);

  return (
    <>
      <tr
        className={cn('cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50', isExpanded && 'bg-gray-50')}
        onClick={onToggle}
      >
        <td className="py-3.5 pl-5 pr-2">
          {isExpanded
            ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            : <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
        </td>
        <td className="py-3.5 pr-3 max-w-[260px]">
          <p className="truncate text-[13px] text-gray-800">{row.prompt.text}</p>
          <span className="mt-0.5 inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-600">
            {row.topic}
          </span>
        </td>
        <td className="py-3.5 pr-3">
          {row.topEngine ? (
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: `${row.topEngine.color}15` }}>
                <EngineIcon engine={row.topEngine.engine} className="size-3" />
              </div>
              <span className="capitalize text-[12px] text-gray-700">{row.topEngine.engine}</span>
            </div>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </td>
        <td className="py-3.5 pr-3 text-right">
          <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold tabular-nums', visColor)}>
            {row.visibilityPct}%
          </span>
        </td>
        <td className="py-3.5 pr-5 text-right">
          {row.dominantSentiment && row.sentimentPct != null ? (
            <span className={cn(
              'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums',
              row.dominantSentiment === 'positive' ? 'bg-emerald-50 text-emerald-600'
              : row.dominantSentiment === 'neutral' ? 'bg-amber-50 text-amber-600'
              : 'bg-red-50 text-red-500'
            )}>
              {row.sentimentPct}% {row.dominantSentiment}
            </span>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={5} className="bg-gray-50/70 px-5 py-3">
            <div className="flex flex-wrap gap-2">
              {engines.map((engine) => {
                const er = row.promptResults.find((r) => r.engine === engine);
                const color = ENGINE_COLORS[engine] ?? '#71717a';
                if (!er) return (
                  <span key={engine} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-500">
                    <EngineIcon engine={engine} className="size-3.5" />
                    <span className="capitalize">{engine}</span> — not tested
                  </span>
                );
                return (
                  <span
                    key={engine}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium"
                    style={{
                      borderColor: er.mentioned ? `${color}25` : 'rgba(239,68,68,0.2)',
                      background: er.mentioned ? `${color}08` : 'rgba(239,68,68,0.04)',
                      color: er.mentioned ? color : '#ef4444',
                    }}
                  >
                    <EngineIcon engine={engine} className="size-3.5" />
                    <span className="capitalize">{engine}</span>
                    {er.mentioned ? ' — mentioned' : ' — not found'}
                    {er.mentioned && er.position != null && ` (#${er.position})`}
                  </span>
                );
              })}
            </div>
            {lastRun > 0 && (
              <p className="mt-2 text-[10px] text-gray-500">
                Last tested: {new Date(lastRun).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Sentiment Panel ─────────────────────────────────────────────────────── */

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
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-emerald-700">Strengths</p>
              <p className="text-[11px] text-gray-600">What AI says you do well</p>
            </div>
          </div>
          {positiveProse
            ? <p className="text-[13px] leading-relaxed text-gray-700">{positiveProse}</p>
            : <p className="text-[13px] italic text-gray-500">No positive signals extracted yet.</p>}
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
              <ThumbsDown className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-red-600">Weaknesses</p>
              <p className="text-[11px] text-gray-600">Areas for improvement</p>
            </div>
          </div>
          {negativeProse
            ? <p className="text-[13px] leading-relaxed text-gray-700">{negativeProse}</p>
            : <p className="text-[13px] italic text-gray-500">No negative signals found — great job!</p>}
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
            <tr className="border-b border-gray-200 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              <th className="pb-2.5 pr-3">Topic</th>
              <th className="pb-2.5 pr-3 text-right">Visibility</th>
              <th className="pb-2.5 pr-3 text-right">Share of Voice</th>
              <th className="pb-2.5 pr-3">Top Brands</th>
              <th className="pb-2.5 text-right text-gray-500">Prompts</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.topic} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                <td className="py-3.5 pr-3 text-gray-800">{t.topic}</td>
                <td className="py-3.5 pr-3 text-right tabular-nums">
                  <span className={cn(
                    'inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold',
                    t.visibilityPct >= 70 ? 'bg-emerald-50 text-emerald-600'
                    : t.visibilityPct >= 40 ? 'bg-amber-50 text-amber-600'
                    : 'bg-red-50 text-red-500'
                  )}>
                    {t.visibilityPct}%
                  </span>
                </td>
                <td className="py-3.5 pr-3 text-right tabular-nums text-gray-600">{t.shareOfVoice}%</td>
                <td className="py-3.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    {t.topBrands.slice(0, 3).map((b) => (
                      <div key={b} className="flex items-center gap-1.5" title={b}>
                        <BrandFavicon name={b} size={18} />
                        <span className="hidden text-[11px] text-gray-600 sm:inline">{b.length > 12 ? b.slice(0, 10) + '..' : b}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 text-right tabular-nums text-gray-600">{t.promptCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}

/* ── Engine Breakdown ────────────────────────────────────────────────────── */

const RANK_STYLES = [
  { bg: 'bg-amber-50',   text: 'text-amber-500',  border: 'border-amber-100' },
  { bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-200' },
  { bg: 'bg-orange-50',  text: 'text-orange-400', border: 'border-orange-100' },
];

function EngineBreakdownSection({ ms, sentimentScore }: { ms: MentionSummary; sentimentScore: number }) {
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

  const maxRate = Math.max(...data.map((d) => d.mentionRate), 1);
  const avgRate = Math.round(data.reduce((sum, d) => sum + d.mentionRate, 0) / data.length);
  const [leader, ...rest] = data;
  const leaderColor = ENGINE_COLORS[leader.engine] ?? '#71717a';

  const sentimentPositive = sentimentScore >= 50;
  const sentimentMid = sentimentScore >= 25;

  return (
    <DashboardPanel className="overflow-hidden p-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Engines</p>
          <p className="mt-0.5 text-[15px] font-semibold text-gray-900">Engine Breakdown</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Avg mention rate</p>
            <p className="mt-0.5 text-[18px] font-bold tabular-nums text-gray-900">{avgRate}%</p>
          </div>
          <div className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
            sentimentPositive ? 'bg-emerald-50' : sentimentMid ? 'bg-amber-50' : 'bg-red-50'
          )}>
            {sentimentPositive
              ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              : sentimentMid
                ? <Minus className="h-3.5 w-3.5 text-amber-500" />
                : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
            <span className={cn(
              'text-[12px] font-semibold',
              sentimentPositive ? 'text-emerald-700' : sentimentMid ? 'text-amber-600' : 'text-red-600'
            )}>
              {sentimentScore}% sentiment
            </span>
          </div>
        </div>
      </div>

      {/* ── Featured leader + ranked list ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">

        {/* Leader card */}
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden border-b border-gray-100 px-6 py-8 lg:border-b-0 lg:border-r"
          style={{ background: `linear-gradient(145deg, ${leaderColor}06 0%, ${leaderColor}12 100%)` }}
        >
          {/* Glow blob */}
          <div
            className="pointer-events-none absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: leaderColor }}
          />
          <span className={cn(
            'mb-3 inline-flex h-6 w-6 items-center justify-center rounded-lg border text-[10px] font-bold',
            RANK_STYLES[0].bg, RANK_STYLES[0].text, RANK_STYLES[0].border
          )}>
            1
          </span>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: `${leaderColor}18`, boxShadow: `0 0 0 1px ${leaderColor}20` }}
          >
            <EngineIcon engine={leader.engine} className="size-7" />
          </div>
          <p className="mt-3 text-[15px] font-bold capitalize text-gray-900">{leader.engine}</p>
          <p
            className="mt-1 text-4xl font-black tabular-nums"
            style={{ color: leaderColor }}
          >
            {leader.mentionRate}%
          </p>
          <p className="mt-1 text-[11px] text-gray-500">{leader.mentioned}/{leader.total} prompts</p>
          {/* Mini bar */}
          <div className="mt-4 h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: '100%', background: `linear-gradient(90deg, ${leaderColor}80, ${leaderColor})`, boxShadow: `0 0 8px ${leaderColor}60` }}
            />
          </div>
        </div>

        {/* Ranked list */}
        <div className="divide-y divide-gray-50">
          {rest.map((entry, i) => {
            const color = ENGINE_COLORS[entry.engine] ?? '#71717a';
            const rank = i + 2;
            const rankStyle = RANK_STYLES[rank - 1] ?? { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-100' };
            const barPct = (entry.mentionRate / maxRate) * 100;

            return (
              <div key={entry.engine} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/70">
                {/* Rank badge */}
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold',
                  rankStyle.bg, rankStyle.text, rankStyle.border
                )}>
                  {rank}
                </span>

                {/* Icon + name */}
                <div className="flex w-32 shrink-0 items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all group-hover:scale-105"
                    style={{ background: `${color}12` }}
                  >
                    <EngineIcon engine={entry.engine} className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold capitalize text-gray-800">{entry.engine}</p>
                    <p className="text-[10px] tabular-nums text-gray-500">{entry.mentioned}/{entry.total} prompts</p>
                  </div>
                </div>

                {/* Bar */}
                <div className="relative flex-1 overflow-hidden rounded-full bg-gray-100" style={{ height: '10px' }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${barPct}%`,
                      background: `linear-gradient(90deg, ${color}80, ${color})`,
                      boxShadow: `0 0 6px ${color}40`,
                    }}
                  />
                  {/* Average marker */}
                  <div
                    className="absolute inset-y-0 w-px bg-gray-300"
                    style={{ left: `${(avgRate / maxRate) * 100}%` }}
                    title={`Avg: ${avgRate}%`}
                  />
                </div>

                {/* Percentage */}
                <span className="w-10 shrink-0 text-right text-[15px] font-bold tabular-nums text-gray-900">
                  {entry.mentionRate}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardPanel>
  );
}
