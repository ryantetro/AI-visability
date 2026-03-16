import type { CrawlData } from '@/types/crawler';
import type { AIEngine, MentionSummary, EngineBreakdown } from '@/types/ai-mentions';
import { generatePrompts, inferBusinessName } from './prompt-generator';
import { testAllEngines } from './engine-tester';
import { analyzeResponse, computeScore } from './mention-analyzer';
import type { MentionTesterService } from './engine-tester';

export async function runMentionTests(
  crawlData: CrawlData,
  tester: MentionTesterService
): Promise<MentionSummary> {
  const prompts = generatePrompts(crawlData);
  const brand = inferBusinessName(crawlData);
  const responses = await testAllEngines(tester, prompts);
  let domain: string | undefined;
  try { domain = new URL(crawlData.url).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
  const results = responses.map((r) => analyzeResponse(r, brand, domain));

  const engines: AIEngine[] = ['chatgpt', 'perplexity', 'gemini', 'claude'];
  const engineBreakdown = {} as Record<AIEngine, EngineBreakdown>;

  for (const engine of engines) {
    const engineResults = results.filter((r) => r.engine === engine);
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
  }

  const competitorMap = new Map<string, number>();
  for (const result of results) {
    for (const comp of result.competitors) {
      competitorMap.set(comp, (competitorMap.get(comp) || 0) + 1);
    }
  }

  const competitorsMentioned = Array.from(competitorMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    overallScore: computeScore(results),
    engineBreakdown,
    results,
    promptsUsed: prompts,
    testedAt: Date.now(),
    competitorsMentioned,
  };
}
