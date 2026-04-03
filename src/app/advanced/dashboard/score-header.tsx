'use client';

import Link from 'next/link';
import {
  Eye,
  Hash,
  MessageSquare,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';
import { scoreColor, barFillColor, formatRelativeTime } from '../lib/utils';
import { computeAverageRank, computeProminenceFallback, formatAverageRankDisplay } from '../lib/mention-utils';
import type { DashboardReportData, RecentScanData } from '../lib/types';
import type { MentionResult } from '@/types/ai-mentions';

interface ScoreHeaderProps {
  scores: DashboardReportData['score']['scores'];
  mentionResults: MentionResult[];
  overallScore: number | null;
  totalMentions: number;
  totalChecks: number;
  domainScans: RecentScanData[];
  latestScanTime: number | null;
  scanAgeDays: number | null;
  onReaudit?: () => void;
  reauditing?: boolean;
}

export function ScoreHeader({
  scores,
  mentionResults,
  overallScore,
  totalMentions,
  totalChecks,
  domainScans,
  latestScanTime,
  scanAgeDays,
  onReaudit,
  reauditing,
}: ScoreHeaderProps) {
  const avgRank = computeAverageRank(mentionResults);
  const avgRankDisplay = formatAverageRankDisplay(avgRank);
  const prominenceFallback = avgRank == null ? computeProminenceFallback(mentionResults) : null;

  const mentionPct = overallScore != null
    ? Math.round(overallScore)
    : totalChecks > 0
      ? Math.round((totalMentions / totalChecks) * 100)
      : null;

  const prevScore = domainScans.find((s, i) => i > 0 && s.scores?.aiVisibility != null)?.scores?.aiVisibility;
  const scoreDelta = prevScore != null ? Math.round(scores.aiVisibility - prevScore) : null;

  return (
    <div className="space-y-4">
      {/* Scan freshness + rescan */}
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

      {/* KPI Row */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* AI Visibility Score */}
        <Link href="/report" className="group block">
          <div className="transition-opacity group-hover:opacity-90">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              AI Visibility
              <InfoTooltip text="Your overall AI visibility score (0-100). Combines discoverability, content quality, web health, and AI mentions." className="ml-1 align-middle" />
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className={cn('text-5xl font-bold tabular-nums tracking-tight', scoreColor(scores.aiVisibility))}>
                {scores.aiVisibility != null ? Math.round(scores.aiVisibility) : '--'}
              </span>
              <span className="text-lg text-zinc-600">%</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {scores.aiVisibility != null && (
                <div className="h-1 w-24 rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(scores.aiVisibility, 100)}%`, backgroundColor: barFillColor(scores.aiVisibility) }}
                  />
                </div>
              )}
              {scoreDelta != null && scoreDelta !== 0 && (
                <span className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  scoreDelta > 0 ? 'bg-[#25c972]/10 text-[#25c972]' : 'bg-[#ff5252]/10 text-[#ff5252]'
                )}>
                  {scoreDelta > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                </span>
              )}
              {scores.potentialLift != null && scores.potentialLift !== 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#25c972]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#25c972]">
                  <TrendingUp className="h-2.5 w-2.5" />
                  +{Math.round(scores.potentialLift)}% potential
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Average Rank */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Rank
            <InfoTooltip text="Your average position when AI engines place your brand in a ranked list. Lower is better." className="ml-1 align-middle" />
          </p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            {avgRankDisplay != null ? (
              <span className="text-3xl font-bold tabular-nums text-white">#{avgRankDisplay}</span>
            ) : prominenceFallback ? (
              <>
                <span className="text-2xl font-bold text-white">{prominenceFallback.label}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                  {prominenceFallback.strongMentionPct}% strong
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-zinc-600">--</span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-zinc-600">
            {avgRankDisplay != null
              ? 'Across ranked AI responses'
              : prominenceFallback
                ? prominenceFallback.detail
                : 'No ranked placements yet'}
          </p>
        </div>

        {/* Mention Rate */}
        <Link href="/brand" className="group block">
          <div className="transition-opacity group-hover:opacity-90">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Mentions
              <InfoTooltip text="The percentage of tested AI answers that mention your brand across all enabled engines." className="ml-1 align-middle" />
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              {mentionPct != null ? (
                <>
                  <span className="text-3xl font-bold tabular-nums text-white">{mentionPct}%</span>
                  <span className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    mentionPct >= 50
                      ? 'bg-[#25c972]/10 text-[#25c972]'
                      : 'bg-[#ff8a1e]/10 text-[#ff8a1e]'
                  )}>
                    {mentionPct >= 50 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {mentionPct >= 50 ? 'strong' : 'needs work'}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold text-zinc-600">--</span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-zinc-600">
              {totalChecks > 0
                ? `${totalMentions} of ${totalChecks} checks`
                : 'Awaiting first scan'}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
