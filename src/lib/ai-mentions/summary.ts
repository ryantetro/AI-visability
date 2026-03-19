import { AI_ENGINES, getAIEngineMeta, getAIEngineModel } from '@/lib/ai-engines';
import type {
  AIEngine,
  EngineBreakdown,
  MentionEngineStatus,
  MentionSummary,
  MentionEngineStatusCode,
  ShareOfVoiceData,
} from '@/types/ai-mentions';

export function createEmptyEngineBreakdown(): Record<AIEngine, EngineBreakdown> {
  return AI_ENGINES.reduce((acc, engine) => {
    acc[engine] = {
      mentioned: 0,
      total: 0,
      avgPosition: null,
      sentiment: 'not-found',
    };
    return acc;
  }, {} as Record<AIEngine, EngineBreakdown>);
}

export function createEngineStatus(
  engine: AIEngine,
  status: MentionEngineStatusCode,
  overrides: Partial<MentionEngineStatus> = {}
): MentionEngineStatus {
  const meta = getAIEngineMeta(engine);
  return {
    status,
    configured: status !== 'not_configured',
    provider: meta.provider,
    model: status === 'not_backfilled' ? null : getAIEngineModel(engine),
    testedPrompts: 0,
    successfulResponses: 0,
    failedPrompts: 0,
    lastTestedAt: null,
    errorMessage: null,
    ...overrides,
  };
}

export function createEmptyEngineStatusMap(
  status: MentionEngineStatusCode = 'not_backfilled'
): Record<AIEngine, MentionEngineStatus> {
  return AI_ENGINES.reduce((acc, engine) => {
    acc[engine] = createEngineStatus(engine, status);
    return acc;
  }, {} as Record<AIEngine, MentionEngineStatus>);
}

function normalizeShareOfVoice(summary: MentionSummary): ShareOfVoiceData | undefined {
  if (!summary.shareOfVoice) return undefined;

  const byEngine = AI_ENGINES.reduce((acc, engine) => {
    acc[engine] = summary.shareOfVoice?.byEngine?.[engine] ?? {
      brandMentions: 0,
      totalMentions: 0,
      sovPct: 0,
    };
    return acc;
  }, {} as ShareOfVoiceData['byEngine']);

  return {
    ...summary.shareOfVoice,
    byEngine,
  };
}

export function normalizeMentionSummary(summary: MentionSummary | null | undefined): MentionSummary | null {
  if (!summary) return null;

  const breakdown = createEmptyEngineBreakdown();
  const rawBreakdown = (summary.engineBreakdown ?? {}) as Partial<Record<AIEngine, Partial<EngineBreakdown>>>;

  for (const engine of AI_ENGINES) {
    breakdown[engine] = {
      ...breakdown[engine],
      ...rawBreakdown[engine],
    };
  }

  const existingStatus = summary.engineStatus as Partial<Record<AIEngine, Partial<MentionEngineStatus>>> | undefined;
  const hasExplicitStatus = Boolean(existingStatus && Object.keys(existingStatus).length > 0);
  const engineStatus = createEmptyEngineStatusMap();

  for (const engine of AI_ENGINES) {
    const total = breakdown[engine].total ?? 0;
    if (hasExplicitStatus && existingStatus?.[engine]) {
      const status = existingStatus[engine]!;
      engineStatus[engine] = createEngineStatus(engine, status.status ?? 'not_backfilled', {
        ...status,
      });
      continue;
    }

    if (total > 0) {
      const latestResult = (summary.results ?? [])
        .filter((result) => result.engine === engine)
        .sort((a, b) => (b.testedAt ?? 0) - (a.testedAt ?? 0))[0];
      engineStatus[engine] = createEngineStatus(engine, 'complete', {
        configured: true,
        testedPrompts: total,
        successfulResponses: total,
        failedPrompts: 0,
        lastTestedAt: latestResult?.testedAt ?? summary.testedAt ?? null,
      });
    } else {
      engineStatus[engine] = createEngineStatus(engine, 'not_backfilled', {
        configured: false,
      });
    }
  }

  return {
    ...summary,
    engineBreakdown: breakdown,
    engineStatus,
    inferredCompetitors: summary.inferredCompetitors ?? [],
    competitorDiscovery: summary.competitorDiscovery,
    competitorLeaderboard: summary.competitorDiscovery
      ? (summary.competitorLeaderboard ?? summary.competitorDiscovery.acceptedCompetitors.map((candidate) => ({
          name: candidate.name,
          count: candidate.mentionCount,
          visibilityPct: candidate.visibilityPct,
          avgPosition: candidate.avgPosition,
          engineCount: candidate.engineCount,
          relevanceScore: candidate.similarityScore,
          source: candidate.source,
        })))
      : [],
    competitorsMentioned: summary.competitorDiscovery
      ? (summary.competitorsMentioned ?? summary.competitorDiscovery.acceptedCompetitors
          .filter((candidate) => candidate.mentionCount > 0)
          .map((candidate) => ({ name: candidate.name, count: candidate.mentionCount })))
      : [],
    shareOfVoice: normalizeShareOfVoice(summary),
  };
}

export function getMentionRate(breakdown: EngineBreakdown): number {
  if (!breakdown.total) return 0;
  return Math.round((breakdown.mentioned / breakdown.total) * 100);
}
