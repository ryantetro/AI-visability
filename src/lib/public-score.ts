import { getDatabase } from '@/lib/services/registry';
import { ScoreResult } from '@/types/score';
import { MentionSummary, AIEngine } from '@/types/ai-mentions';
import type { ScanJob } from '@/types/scan';
import { getDomain } from '@/lib/url-utils';
import { normalizeMentionSummary } from '@/lib/ai-mentions/summary';
import { getBandInfo } from '@/lib/scorer';
import { computePublicOverallScore } from '@/lib/scoring-weights';

export interface PublicEngineResult {
  engine: AIEngine;
  label: string;
  mentioned: number;
  total: number;
  sentiment: string;
  status: 'complete' | 'not_configured' | 'not_backfilled' | 'error';
}

export interface PublicTopFix {
  label: string;
  instruction: string;
  estimatedLift: number;
  effortBand: string;
}

export interface PublicPillarScore {
  key: string;
  label: string;
  percentage: number | null;
}

export interface PublicScoreSummary {
  id: string;
  url: string;
  domain: string;
  completedAt: number;
  percentage: number;
  aiVisibility: number;
  webHealth: number | null;
  mentionScore: number | null;
  total: number;
  maxTotal: number;
  band: string;
  bandInfo: {
    band: string;
    label: string;
    color: string;
    min: number;
    max: number;
  };
  engines: PublicEngineResult[];
  topFixes: PublicTopFix[];
  pillars: PublicPillarScore[];
  totalFixCount: number;
  mentionRate: number | null;
}

export type PublicScoreScanLike = Pick<
  ScanJob,
  'id' | 'url' | 'status' | 'completedAt' | 'scoreResult' | 'mentionSummary'
>;

export function buildPublicScoreSummaryFromScan(scan: PublicScoreScanLike | null | undefined): PublicScoreSummary | null {
  if (!scan || scan.status !== 'complete' || !scan.scoreResult || !scan.completedAt) {
    return null;
  }

  const scoreResult = scan.scoreResult as ScoreResult;
  const mentionSummary = normalizeMentionSummary(scan.mentionSummary as MentionSummary | undefined);

  // Build engine breakdown for public display
  const engineOrder: AIEngine[] = ['chatgpt', 'perplexity', 'gemini', 'claude', 'grok'];
  const engineLabels: Record<AIEngine, string> = {
    chatgpt: 'ChatGPT',
    perplexity: 'Perplexity',
    gemini: 'Gemini',
    claude: 'Claude',
    grok: 'Grok',
  };
  const engines: PublicEngineResult[] = engineOrder.map((engine) => {
    const eb = mentionSummary?.engineBreakdown?.[engine];
    const es = mentionSummary?.engineStatus?.[engine];
    return {
      engine,
      label: engineLabels[engine],
      mentioned: eb?.mentioned ?? 0,
      total: eb?.total ?? 0,
      sentiment: eb?.sentiment ?? 'not-found',
      status: es?.status ?? 'not_configured',
    };
  });

  // Top 3 fixes for public display
  const topFixes: PublicTopFix[] = (scoreResult.fixes ?? []).slice(0, 3).map((f) => ({
    label: f.label,
    instruction: f.instruction,
    estimatedLift: f.estimatedLift,
    effortBand: f.effortBand,
  }));

  // Web health pillars
  const pillars: PublicPillarScore[] = (scoreResult.webHealth?.pillars ?? []).map((p) => ({
    key: p.key,
    label: p.label ?? p.key,
    percentage: p.percentage,
  }));

  // Recompute overall with pillar-level weights including mentions
  const perfPillar = pillars.find(p => p.key === 'performance');
  const trustPillarData = pillars.find(p => p.key === 'security');
  const perfScore = perfPillar?.percentage ?? null;
  const trustScore = trustPillarData?.percentage ?? null;
  const mScore = mentionSummary?.overallScore ?? null;

  const newOverall = computePublicOverallScore(
    scoreResult.scores.aiVisibility,
    perfScore,
    trustScore,
    mScore,
  );
  const newBandInfo = getBandInfo(newOverall);

  // Compute mention rate from engine data
  const totalMentioned = engines.reduce((sum, e) => sum + (e.status === 'complete' ? e.mentioned : 0), 0);
  const totalPrompts = engines.reduce((sum, e) => sum + (e.status === 'complete' ? e.total : 0), 0);
  const mentionRate = totalPrompts > 0 ? totalMentioned / totalPrompts : null;

  return {
    id: scan.id,
    url: scan.url,
    domain: getDomain(scan.url),
    completedAt: scan.completedAt,
    percentage: newOverall,
    aiVisibility: scoreResult.scores.aiVisibility,
    webHealth: scoreResult.scores.webHealth,
    mentionScore: mentionSummary?.overallScore ?? null,
    total: scoreResult.total,
    maxTotal: scoreResult.maxTotal,
    band: newBandInfo.band,
    bandInfo: newBandInfo,
    engines,
    topFixes,
    pillars,
    totalFixCount: (scoreResult.fixes ?? []).length,
    mentionRate,
  };
}

export async function getPublicScoreSummary(scanId: string): Promise<PublicScoreSummary | null> {
  const db = getDatabase();
  const scan = await db.getScan(scanId);
  return buildPublicScoreSummaryFromScan(scan);
}
