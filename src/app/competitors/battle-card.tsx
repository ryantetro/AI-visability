'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Loader2, Minus, RefreshCw, Trash2, Trophy } from 'lucide-react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { ScoreRing } from '@/components/ui/score-ring';
import { BrandFavicon } from '@/app/advanced/panels/shared';
import { CompetitorScanProgress } from './competitor-scan-progress';
import { getScoreColor, formatRelativeTime } from '@/app/advanced/lib/utils';
import { cn } from '@/lib/utils';
import type { CompetitorWithScanData, CompetitorComparisonData } from '@/types/competitors';

interface BattleCardProps {
  userBrand: CompetitorComparisonData['userBrand'];
  competitor: CompetitorWithScanData;
  index: number;
  onDelete: (id: string) => Promise<void>;
  onRescan: (id: string) => Promise<void>;
  onScanComplete: () => void;
}

interface MetricRowProps {
  label: string;
  leftValue: number | null;
  rightValue: number | null;
  /** If true, higher is worse (e.g. avg position ranking) */
  invertWinner?: boolean;
}

function MetricRow({ label, leftValue, rightValue, invertWinner }: MetricRowProps) {
  const left = leftValue ?? 0;
  const right = rightValue ?? 0;
  const maxVal = Math.max(left, right, 1);
  const leftPct = (left / maxVal) * 100;
  const rightPct = (right / maxVal) * 100;

  const leftWins = invertWinner ? left <= right : left >= right;
  const tied = left === right;

  return (
    <div className="group grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      {/* Left side */}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'min-w-[28px] text-right text-[13px] font-bold tabular-nums',
            tied ? 'text-zinc-400' : leftWins ? 'text-white' : 'text-zinc-500'
          )}
        >
          {leftValue != null ? Math.round(leftValue) : '--'}
        </span>
        <div className="flex h-[6px] flex-1 justify-end overflow-hidden rounded-full bg-white/[0.04]">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${leftPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              backgroundColor: tied ? 'rgba(255,255,255,0.2)' : leftWins ? '#25c972' : 'rgba(255,255,255,0.1)',
            }}
          />
        </div>
      </div>

      {/* Center label */}
      <span className="w-[100px] text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>

      {/* Right side */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-[6px] flex-1 overflow-hidden rounded-full bg-white/[0.04]">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${rightPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              backgroundColor: tied ? 'rgba(255,255,255,0.2)' : !leftWins ? '#25c972' : 'rgba(255,255,255,0.1)',
            }}
          />
        </div>
        <span
          className={cn(
            'min-w-[28px] text-[13px] font-bold tabular-nums',
            tied ? 'text-zinc-400' : !leftWins ? 'text-white' : 'text-zinc-500'
          )}
        >
          {rightValue != null ? Math.round(rightValue) : '--'}
        </span>
      </div>
    </div>
  );
}

export function BattleCard({
  userBrand,
  competitor,
  index,
  onDelete,
  onRescan,
  onScanComplete,
}: BattleCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [rescanning, setRescanning] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(competitor.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await onRescan(competitor.id);
    } finally {
      setRescanning(false);
    }
  };

  const stableOnScanComplete = useCallback(onScanComplete, [onScanComplete]);

  const isScanning = competitor.status === 'scanning';
  const isFailed = competitor.status === 'failed';
  const isComplete = competitor.status === 'complete' && competitor.scanData;

  const userScore = userBrand.overallScore;
  const compScore = competitor.scanData?.overallScore ?? null;
  const scoreDiff = compScore != null ? userScore - compScore : null;
  const userWins = (userScore ?? 0) >= (compScore ?? 0);

  // Metric extraction
  const uMention = userBrand.mentionSummary;
  const cMention = competitor.scanData?.mentionSummary;

  const uVisibility = uMention?.visibilityPct ?? null;
  const cVisibility = cMention?.visibilityPct ?? null;

  const uSentiment = uMention?.sentimentSummary?.positiveScore ?? null;
  const cSentiment = cMention?.sentimentSummary?.positiveScore ?? null;

  const uSOV = uMention?.shareOfVoice?.shareOfVoicePct ?? null;
  const cSOV = cMention?.shareOfVoice?.shareOfVoicePct ?? null;

  function avgPosition(
    breakdown: Record<string, { avgPosition: number | null }> | undefined
  ): number | null {
    if (!breakdown) return null;
    const positions = Object.values(breakdown)
      .map((e) => e.avgPosition)
      .filter((p): p is number => p != null);
    return positions.length > 0
      ? Math.round((positions.reduce((s, p) => s + p, 0) / positions.length) * 10) / 10
      : null;
  }

  const uAvgPos = avgPosition(uMention?.engineBreakdown);
  const cAvgPos = avgPosition(cMention?.engineBreakdown);
  const uAiScore = userBrand.aiVisibilityScore;
  const cAiScore = competitor.scanData?.aiVisibilityScore ?? null;

  // Count metric wins
  const metrics = [
    { l: uAiScore, r: cAiScore },
    { l: uVisibility, r: cVisibility },
    { l: uAvgPos != null ? 100 - uAvgPos * 10 : null, r: cAvgPos != null ? 100 - cAvgPos * 10 : null },
    { l: uSentiment, r: cSentiment },
    { l: uSOV, r: cSOV },
  ];
  const userMetricWins = metrics.filter((m) => m.l != null && m.r != null && m.l > m.r).length;
  const compMetricWins = metrics.filter((m) => m.l != null && m.r != null && m.r > m.l).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <DashboardPanel className="relative overflow-hidden p-0">
        {/* Top accent line */}
        <div
          className="h-[2px] w-full"
          style={{
            background: isComplete
              ? `linear-gradient(90deg, ${getScoreColor(userScore)} 0%, transparent 40%, transparent 60%, ${getScoreColor(compScore)} 100%)`
              : 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)',
          }}
        />

        <div className="p-6">
          {/* Header: VS layout */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrandFavicon name={userBrand.domain} size={22} />
              <div>
                <span className="text-[13px] font-semibold text-white">{userBrand.domain}</span>
                {isComplete && (
                  <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-zinc-500">you</span>
                )}
              </div>
            </div>
            <div className="flex h-7 items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3">
              <span className="text-[10px] font-bold tracking-wider text-zinc-500">VS</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <span className="text-[13px] font-semibold text-white">{competitor.competitorDomain}</span>
              </div>
              <BrandFavicon name={competitor.competitorDomain} size={22} />
            </div>
          </div>

          {/* Scanning state */}
          {isScanning && competitor.scanId && (
            <div className="mt-6">
              <CompetitorScanProgress
                scanId={competitor.scanId}
                onComplete={stableOnScanComplete}
              />
            </div>
          )}

          {/* Failed state */}
          {isFailed && (
            <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-center">
              <p className="text-[12px] text-red-300">Scan failed</p>
              <button
                type="button"
                onClick={() => void handleRescan()}
                disabled={rescanning}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-400 transition-colors hover:text-red-300"
              >
                {rescanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Retry
              </button>
            </div>
          )}

          {/* Complete state */}
          {isComplete && (
            <>
              {/* Score comparison */}
              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                {/* User score */}
                <div className="flex flex-col items-center">
                  <ScoreRing
                    score={userScore}
                    color={getScoreColor(userScore)}
                    size={90}
                    emphasis="compact"
                  />
                </div>

                {/* Center: Score difference */}
                <div className="flex flex-col items-center gap-1.5">
                  {scoreDiff != null && (
                    <div
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums',
                        scoreDiff > 0
                          ? 'bg-[#25c972]/10 text-[#25c972]'
                          : scoreDiff < 0
                            ? 'bg-[#ff5252]/10 text-[#ff5252]'
                            : 'bg-white/[0.06] text-zinc-400'
                      )}
                    >
                      {scoreDiff > 0 ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : scoreDiff < 0 ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {scoreDiff > 0 ? '+' : ''}{scoreDiff}
                    </div>
                  )}
                  <span className="text-[9px] text-zinc-600">
                    {scoreDiff != null && scoreDiff > 0
                      ? 'ahead'
                      : scoreDiff != null && scoreDiff < 0
                        ? 'behind'
                        : 'tied'}
                  </span>
                </div>

                {/* Competitor score */}
                <div className="flex flex-col items-center">
                  <ScoreRing
                    score={compScore}
                    color={getScoreColor(compScore)}
                    size={90}
                    emphasis="compact"
                  />
                </div>
              </div>

              {/* Win summary */}
              <div className="mt-5 flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className={cn(
                    'font-bold tabular-nums',
                    userMetricWins > compMetricWins ? 'text-[#25c972]' : 'text-zinc-500'
                  )}>
                    {userMetricWins}
                  </span>
                  <span className="text-zinc-600">wins</span>
                </div>
                <div className="h-3 w-px bg-white/[0.08]" />
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className={cn(
                    'font-bold tabular-nums',
                    compMetricWins > userMetricWins ? 'text-[#25c972]' : 'text-zinc-500'
                  )}>
                    {compMetricWins}
                  </span>
                  <span className="text-zinc-600">wins</span>
                </div>
              </div>

              {/* Divider */}
              <div className="mt-5 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

              {/* Metric comparison rows */}
              <div className="mt-5 space-y-3.5">
                <MetricRow label="AI Visibility" leftValue={uAiScore} rightValue={cAiScore} />
                <MetricRow label="Mention Rate" leftValue={uVisibility ?? null} rightValue={cVisibility ?? null} />
                <MetricRow
                  label="Avg Position"
                  leftValue={uAvgPos != null ? 100 - uAvgPos * 10 : null}
                  rightValue={cAvgPos != null ? 100 - cAvgPos * 10 : null}
                />
                <MetricRow label="Sentiment" leftValue={uSentiment} rightValue={cSentiment} />
                <MetricRow label="Share of Voice" leftValue={uSOV} rightValue={cSOV} />
              </div>

              {/* Overall winner banner */}
              {scoreDiff != null && scoreDiff !== 0 && (
                <>
                  <div className="mt-5 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-[#ffbb00]" />
                    <span className="text-[11px] font-semibold text-zinc-300">
                      {userWins ? userBrand.domain : competitor.competitorDomain}
                    </span>
                    <span className="text-[11px] text-zinc-500">leads overall</span>
                  </div>
                </>
              )}

              {/* Last scanned */}
              {competitor.lastScannedAt && (
                <p className="mt-3 text-center text-[10px] text-zinc-600">
                  Scanned {formatRelativeTime(new Date(competitor.lastScannedAt).getTime())}
                </p>
              )}
            </>
          )}

          {/* Pending state */}
          {competitor.status === 'pending' && (
            <div className="mt-6 text-center">
              <p className="text-[12px] text-zinc-500">Scan pending...</p>
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 transition-colors hover:text-red-400"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Remove
            </button>
            {isComplete && (
              <button
                type="button"
                onClick={() => void handleRescan()}
                disabled={rescanning}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white"
              >
                {rescanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Re-scan
              </button>
            )}
          </div>
        </div>
      </DashboardPanel>
    </motion.div>
  );
}
