import type { CrawlData } from '@/types/crawler';
import type { EngineBreakdown, MentionSummary } from '@/types/ai-mentions';
import { buildBusinessProfile, generatePrompts } from './prompt-generator';
import { runEngineTests } from './engine-tester';
import {
  analyzeResponse, computeScore,
  computeShareOfVoice, computeSentimentSummary,
  computeTopicPerformance, computeCompetitorLeaderboard,
} from './mention-analyzer';
import type { MentionTesterService } from './engine-tester';
import { AI_ENGINES, getAIEngineModel } from '@/lib/ai-engines';
import { createEmptyEngineBreakdown, createEmptyEngineStatusMap } from './summary';
import { discoverCompetitors } from './competitor-discovery';

export async function runMentionTests(
  crawlData: CrawlData,
  tester: MentionTesterService
): Promise<MentionSummary> {
  const businessProfile = buildBusinessProfile(crawlData);
  const prompts = generatePrompts(crawlData, businessProfile);
  const brand = businessProfile.brand;
  const engineRun = await runEngineTests(tester, prompts);
  const responses = engineRun.responses;
  let domain: string | undefined;
  try { domain = new URL(crawlData.url).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
  const results = responses.map((r) => analyzeResponse(r, brand, domain));

  const engineBreakdown = createEmptyEngineBreakdown();
  const engineStatus = createEmptyEngineStatusMap();

  for (const engine of AI_ENGINES) {
    const engineResults = results.filter((r) => r.engine === engine);
    const engineFailures = engineRun.failures.filter((failure) => failure.engine === engine);
    const mentioned = engineResults.filter((r) => r.mentioned).length;
    const positions = engineResults
      .filter((r) => r.position !== null)
      .map((r) => r.position!);

    const sentiments = engineResults
      .filter((r) => r.sentiment !== null)
      .map((r) => r.sentiment!);

    let dominantSentiment: EngineBreakdown['sentiment'] = 'not-found';
    if (mentioned > 0) {
      const counts = { positive: 0, neutral: 0, negative: 0 };
      for (const s of sentiments) counts[s]++;
      dominantSentiment =
        counts.positive >= counts.neutral && counts.positive >= counts.negative
          ? 'positive'
          : counts.negative >= counts.neutral
            ? 'negative'
            : 'neutral';
    }

    engineBreakdown[engine] = {
      mentioned,
      total: engineResults.length,
      avgPosition:
        positions.length > 0
          ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
          : null,
      sentiment: dominantSentiment,
    };

    const lastTestedAt = [...engineResults.map((result) => result.testedAt), ...engineFailures.map((failure) => failure.testedAt)]
      .sort((a, b) => b - a)[0] ?? null;

    if (!engineRun.engines.includes(engine)) {
      engineStatus[engine] = {
        ...engineStatus[engine],
        status: 'not_configured',
        configured: false,
        model: null,
      };
    } else if (engineResults.length === 0 && engineFailures.length > 0) {
      engineStatus[engine] = {
        ...engineStatus[engine],
        status: 'error',
        configured: true,
        model: getAIEngineModel(engine),
        testedPrompts: prompts.length,
        successfulResponses: 0,
        failedPrompts: engineFailures.length,
        lastTestedAt,
        errorMessage: engineFailures[0]?.error ?? 'Engine query failed',
      };
    } else {
      engineStatus[engine] = {
        ...engineStatus[engine],
        status: 'complete',
        configured: true,
        model: getAIEngineModel(engine),
        testedPrompts: prompts.length,
        successfulResponses: engineResults.length,
        failedPrompts: engineFailures.length,
        lastTestedAt,
        errorMessage: engineFailures[0]?.error ?? null,
      };
    }
  }

  const competitorDiscovery = discoverCompetitors(crawlData, prompts, results, businessProfile);
  const inferredCompetitors = competitorDiscovery.acceptedCompetitors
    .filter((candidate) => candidate.source === 'scan_inferred')
    .map((candidate) => ({
      name: candidate.name,
      confidence: candidate.confidence,
      source: candidate.evidence.some((evidence) => evidence.startsWith('Prompt seed'))
        ? 'prompt_seed' as const
        : 'scan_candidate' as const,
    }));

  const competitorLeaderboard = computeCompetitorLeaderboard(results, prompts, {
    inferredCompetitors,
    acceptedCompetitors: competitorDiscovery.acceptedCompetitors,
    brand,
  });
  const competitorsMentioned = competitorLeaderboard
    .slice()
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || b.visibilityPct - a.visibilityPct || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((entry) => ({ name: entry.name, count: entry.count }));

  const mentionedCount = results.filter((r) => r.mentioned).length;

  return {
    overallScore: computeScore(results),
    engineBreakdown,
    engineStatus,
    results,
    promptsUsed: prompts,
    testedAt: Date.now(),
    competitorsMentioned,
    inferredCompetitors,
    competitorDiscovery,
    visibilityPct: results.length > 0 ? Math.round((mentionedCount / results.length) * 100) : 0,
    shareOfVoice: computeShareOfVoice(results),
    sentimentSummary: computeSentimentSummary(results, brand),
    topicPerformance: computeTopicPerformance(results, prompts),
    competitorLeaderboard,
  };
}
