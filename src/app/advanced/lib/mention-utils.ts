import type { DashboardReportData } from './types';
import { polishSentimentBullets } from '@/lib/ai-mentions/sentiment-format';

type MentionSummary = NonNullable<DashboardReportData['mentionSummary']>;
type MentionSummaryResult = MentionSummary['results'][number];

export function computeAverageRank(results: Array<Pick<MentionSummaryResult, 'mentioned' | 'position'>>): number | null {
  const rankedMentions = results.filter((result) => result.mentioned && result.position != null);
  if (rankedMentions.length === 0) return null;

  return Math.round(
    (
      rankedMentions.reduce((sum, result) => sum + (result.position ?? 0), 0) /
      rankedMentions.length
    ) * 10
  ) / 10;
}

export function formatAverageRankDisplay(averageRank: number | null): number | null {
  if (averageRank == null) return null;
  return Math.ceil(averageRank);
}

export interface ProminenceFallback {
  label: 'Prominent' | 'Mixed' | 'Passing';
  detail: string;
  strongMentionPct: number;
  strongMentionCount: number;
  mentionedCount: number;
}

export function computeProminenceFallback(
  results: Array<Pick<MentionSummaryResult, 'mentioned' | 'positionContext'>>,
): ProminenceFallback | null {
  const mentionedResults = results.filter((result) => result.mentioned);
  if (mentionedResults.length === 0) return null;

  const strongMentionCount = mentionedResults.filter(
    (result) => result.positionContext === 'listed_ranking' || result.positionContext === 'prominent',
  ).length;
  const mentionedCount = mentionedResults.length;
  const strongMentionPct = Math.round((strongMentionCount / mentionedCount) * 100);

  if (strongMentionCount === 0) {
    return {
      label: 'Passing',
      detail: 'Mentions were mostly passing references instead of ranked or prominent placements',
      strongMentionPct,
      strongMentionCount,
      mentionedCount,
    };
  }

  if (strongMentionPct >= 60) {
    return {
      label: 'Prominent',
      detail: `${strongMentionCount}/${mentionedCount} mentions placed your brand prominently in the answer`,
      strongMentionPct,
      strongMentionCount,
      mentionedCount,
    };
  }

  return {
    label: 'Mixed',
    detail: `${strongMentionCount}/${mentionedCount} mentions placed your brand prominently in the answer`,
    strongMentionPct,
    strongMentionCount,
    mentionedCount,
  };
}

export function computeVisibilityPct(ms: MentionSummary): number {
  if (ms.visibilityPct != null) return ms.visibilityPct;
  const results = ms.results ?? [];
  if (results.length === 0) return 0;
  const mentioned = results.filter((r) => r.mentioned).length;
  return Math.round((mentioned / results.length) * 100);
}

export function computeShareOfVoicePct(ms: MentionSummary): number {
  if (ms.shareOfVoice?.shareOfVoicePct != null) return ms.shareOfVoice.shareOfVoicePct;
  const results = ms.results ?? [];
  if (results.length === 0) return 0;
  let brandMentions = 0;
  let compMentions = 0;
  for (const r of results) {
    if (r.mentioned) brandMentions++;
    compMentions += (r.competitors?.length ?? 0);
  }
  const total = brandMentions + compMentions;
  return total > 0 ? Math.round((brandMentions / total) * 100) : 0;
}

export function computeSentimentScore(ms: MentionSummary): number {
  if (ms.sentimentSummary?.positiveScore != null) return ms.sentimentSummary.positiveScore;
  const results = ms.results?.filter((r) => r.mentioned && r.sentiment) ?? [];
  if (results.length === 0) return 50;
  const pos = results.filter((r) => r.sentiment === 'positive').length;
  return Math.round((pos / results.length) * 100);
}

export interface DerivedCompetitorEntry {
  name: string;
  count: number;
  visibilityPct: number;
  avgPosition: number | null;
  engineCount?: number;
  relevanceScore?: number;
  source?: 'ai_validated' | 'tracked' | 'scan_inferred';
}

export function deriveCompetitorLeaderboard(ms: MentionSummary): DerivedCompetitorEntry[] {
  if (!ms.competitorDiscovery) return [];
  if (ms.competitorLeaderboard?.length) return ms.competitorLeaderboard;
  return ms.competitorDiscovery.acceptedCompetitors.map((candidate) => ({
    name: candidate.name,
    count: candidate.mentionCount,
    visibilityPct: candidate.visibilityPct,
    avgPosition: candidate.avgPosition,
    engineCount: candidate.engineCount,
    relevanceScore: candidate.similarityScore,
    source: candidate.source,
  }));
}

export interface DerivedTopicPerformance {
  topic: string;
  visibilityPct: number;
  shareOfVoice: number;
  topBrands: string[];
  promptCount: number;
}

export function deriveTopicPerformance(ms: MentionSummary): DerivedTopicPerformance[] {
  if (ms.topicPerformance?.length) return ms.topicPerformance;
  const results = ms.results ?? [];
  const prompts = ms.promptsUsed ?? [];
  const topicMap = new Map<string, { mentioned: number; total: number; brand: number; comp: number; topBrands: Map<string, number> }>();

  for (const r of results) {
    const topic = r.prompt.topic ?? r.prompt.category ?? 'General';
    let entry = topicMap.get(topic);
    if (!entry) {
      entry = { mentioned: 0, total: 0, brand: 0, comp: 0, topBrands: new Map() };
      topicMap.set(topic, entry);
    }
    entry.total++;
    if (r.mentioned) { entry.mentioned++; entry.brand++; }
    for (const c of (r.competitors ?? [])) {
      entry.topBrands.set(c, (entry.topBrands.get(c) || 0) + 1);
      entry.comp++;
    }
  }

  const topics: DerivedTopicPerformance[] = [];
  for (const [topic, data] of topicMap) {
    const totalM = data.brand + data.comp;
    topics.push({
      topic,
      visibilityPct: data.total > 0 ? Math.round((data.mentioned / data.total) * 100) : 0,
      shareOfVoice: totalM > 0 ? Math.round((data.brand / totalM) * 100) : 0,
      topBrands: Array.from(data.topBrands.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n),
      promptCount: prompts.filter((p) => (p.topic ?? p.category) === topic).length,
    });
  }

  return topics.sort((a, b) => b.visibilityPct - a.visibilityPct);
}

export function deriveSentimentBullets(ms: MentionSummary, brandContext?: string): { positives: string[]; negatives: string[] } {
  if (ms.sentimentSummary) {
    return {
      positives: ms.sentimentSummary.positives.slice(0, 5),
      negatives: ms.sentimentSummary.negatives.slice(0, 5),
    };
  }

  const posWords = ['excellent', 'great', 'best', 'leading', 'innovative', 'powerful', 'top', 'recommended', 'trusted'];
  const negWords = ['poor', 'lacking', 'limited', 'outdated', 'expensive', 'slow', 'unreliable', 'concerns', 'criticized'];

  const positives: string[] = [];
  const negatives: string[] = [];

  for (const r of (ms.results ?? [])) {
    if (!r.mentioned || !r.rawSnippet) continue;
    const sentences = r.rawSnippet.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (positives.length < 5 && posWords.some((kw) => lower.includes(kw))) {
        const cleaned = sentence.trim().replace(/^\W+/, '');
        if (cleaned && !positives.includes(cleaned)) positives.push(cleaned);
      }
      if (negatives.length < 5 && negWords.some((kw) => lower.includes(kw))) {
        const cleaned = sentence.trim().replace(/^\W+/, '');
        if (cleaned && !negatives.includes(cleaned)) negatives.push(cleaned);
      }
    }
  }

  return {
    positives: polishSentimentBullets(positives, 'positive', {
      brandContext,
      limit: 5,
    }),
    negatives: polishSentimentBullets(negatives, 'negative', {
      brandContext,
      limit: 5,
    }),
  };
}
