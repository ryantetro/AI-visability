'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import type { CompetitorComparisonData } from '@/types/competitors';

interface CompetitorKpiRowProps {
  data: CompetitorComparisonData;
}

function getOrdinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function rawScoreColor(score: number | null): string {
  if (score === null) return '#71717a';
  if (score >= 80) return '#25c972';
  if (score >= 60) return '#ffbb00';
  if (score >= 40) return '#ff8a1e';
  return '#ff5252';
}

function sovColor(pct: number): string {
  if (pct >= 50) return '#25c972';
  if (pct >= 30) return '#ffbb00';
  return '#ff5252';
}

/** Animated counter that counts up from 0 to target */
function useAnimatedValue(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

/** Mini radial arc used for score and SOV cards */
function MiniArc({
  value,
  max = 100,
  color,
  size = 64,
  strokeWidth = 5,
}: {
  value: number;
  max?: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const animatedValue = useAnimatedValue(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedValue / max) * circumference;
  const offset = circumference - progress;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        stroke="rgba(255,255,255,0.06)"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.12s ease-out' }}
      />
    </svg>
  );
}

export function CompetitorKpiRow({ data }: CompetitorKpiRowProps) {
  const userScore = data.userBrand.overallScore;

  const completedCompetitors = data.competitors.filter(
    (c) => c.status === 'complete' && c.scanData?.overallScore != null
  );

  const avgCompetitorScore =
    completedCompetitors.length > 0
      ? Math.round(
          completedCompetitors.reduce((sum, c) => sum + (c.scanData?.overallScore ?? 0), 0) /
            completedCompetitors.length
        )
      : null;

  // Rank
  const allScores = [
    { name: data.userBrand.domain, score: userScore, isUser: true },
    ...completedCompetitors.map((c) => ({
      name: c.competitorDomain,
      score: c.scanData?.overallScore ?? 0,
      isUser: false,
    })),
  ].sort((a, b) => b.score - a.score);

  const userRank = allScores.findIndex((s) => s.isUser) + 1;
  const totalBrands = allScores.length;
  const hasRank = completedCompetitors.length > 0;

  // Share of voice
  const userVisibility = data.userBrand.mentionSummary?.visibilityPct ?? 0;
  const totalVisibility =
    userVisibility +
    completedCompetitors.reduce(
      (sum, c) => sum + (c.scanData?.mentionSummary?.visibilityPct ?? 0),
      0
    );
  const sovPct = totalVisibility > 0 ? Math.round((userVisibility / totalVisibility) * 100) : 0;
  const hasSov = completedCompetitors.length > 0;

  const userColor = rawScoreColor(userScore);
  const compColor = rawScoreColor(avgCompetitorScore);
  const animatedUserScore = useAnimatedValue(userScore ?? 0);
  const animatedCompScore = useAnimatedValue(avgCompetitorScore ?? 0);
  const animatedSov = useAnimatedValue(hasSov ? sovPct : 0);

  const rankColor = userRank === 1 ? '#25c972' : '#71717a';

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Your Score */}
      <DashboardPanel className="relative overflow-hidden p-5">
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${userColor}, transparent)` }}
        />
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <MiniArc value={userScore ?? 0} color={userColor} />
            <span
              className="absolute inset-0 flex items-center justify-center text-[15px] font-bold"
              style={{ color: userColor }}
            >
              {userScore != null ? animatedUserScore : '--'}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Your Score
            </p>
            <p className="mt-0.5 text-[12px] text-zinc-400">
              {userScore != null && userScore >= 80
                ? 'Excellent'
                : userScore != null && userScore >= 60
                  ? 'Good'
                  : userScore != null && userScore >= 40
                    ? 'Needs work'
                    : userScore != null
                      ? 'Low'
                      : 'No data'}
            </p>
          </div>
        </div>
      </DashboardPanel>

      {/* Avg Competitor */}
      <DashboardPanel className="relative overflow-hidden p-5">
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${compColor}, transparent)` }}
        />
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <MiniArc value={avgCompetitorScore ?? 0} color={compColor} />
            <span
              className="absolute inset-0 flex items-center justify-center text-[15px] font-bold"
              style={{ color: compColor }}
            >
              {avgCompetitorScore != null ? animatedCompScore : '--'}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Avg Competitor
            </p>
            <p className="mt-0.5 text-[12px] text-zinc-400">
              {completedCompetitors.length} tracked
            </p>
          </div>
        </div>
      </DashboardPanel>

      {/* Your Rank */}
      <DashboardPanel className="relative overflow-hidden p-5">
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: hasRank
              ? `linear-gradient(90deg, ${rankColor}, transparent)`
              : 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)',
          }}
        />
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border"
            style={{
              borderColor: hasRank ? `${rankColor}33` : 'rgba(255,255,255,0.08)',
              background: hasRank
                ? `radial-gradient(circle, ${rankColor}12 0%, transparent 70%)`
                : 'transparent',
            }}
          >
            {hasRank ? (
              <div className="flex flex-col items-center">
                <span
                  className="text-[20px] font-bold leading-none"
                  style={{ color: rankColor }}
                >
                  {userRank}
                </span>
                <span
                  className="text-[9px] font-semibold uppercase"
                  style={{ color: rankColor, opacity: 0.7 }}
                >
                  {getOrdinal(userRank).replace(/\d+/, '')}
                </span>
              </div>
            ) : (
              <span className="text-[15px] font-bold text-zinc-600">--</span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Your Rank
            </p>
            <p className="mt-0.5 text-[12px] text-zinc-400">
              {hasRank ? `of ${totalBrands} brands` : 'No data'}
            </p>
          </div>
        </div>
      </DashboardPanel>

      {/* Share of Voice */}
      <DashboardPanel className="relative overflow-hidden p-5">
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: hasSov
              ? `linear-gradient(90deg, ${sovColor(sovPct)}, transparent)`
              : 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)',
          }}
        />
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <MiniArc
              value={hasSov ? sovPct : 0}
              color={hasSov ? sovColor(sovPct) : '#3f3f46'}
            />
            <span
              className="absolute inset-0 flex items-center justify-center text-[14px] font-bold"
              style={{ color: hasSov ? sovColor(sovPct) : '#71717a' }}
            >
              {hasSov ? `${animatedSov}` : '--'}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Share of Voice
            </p>
            <p className="mt-0.5 text-[12px] text-zinc-400">
              {hasSov ? `${sovPct}% of mentions` : 'No data'}
            </p>
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}
