import type {
  MentionResult, MentionPrompt, CitationUrl,
  AcceptedCompetitor, ShareOfVoiceData, SentimentSummary, TopicPerformance, CompetitorLeaderboardEntry, InferredCompetitor,
} from '@/types/ai-mentions';
import type { EngineResponse } from './engine-tester';
import { AI_ENGINES } from '@/lib/ai-engines';
import {
  competitorKey,
  isGenericPlatformBrand,
  isLowQualityCompetitorName,
  namesLikelySameBrand,
  normalizeCompetitorName,
} from './competitor-discovery';
import {
  extractProfessionalSentimentSentences,
  polishSentimentBullets,
} from './sentiment-format';

function fuzzyMatch(text: string, brand: string): boolean {
  const lower = text.toLowerCase();
  const brandLower = brand.toLowerCase();

  if (lower.includes(brandLower)) return true;

  const noPunctuation = brandLower.replace(/[^a-z0-9\s]/g, '');
  if (noPunctuation && lower.includes(noPunctuation)) return true;

  const noSpaces = brandLower.replace(/\s+/g, '');
  if (noSpaces.length > 3 && lower.includes(noSpaces)) return true;

  return false;
}

function detectPosition(text: string, brand: string): number | null {
  const lower = text.toLowerCase();
  const brandLower = brand.toLowerCase();

  const lines = lower.split('\n').filter((l) => l.trim());
  const numberedPattern = /^\s*(\d+)[.)]\s/;

  for (let i = 0; i < lines.length; i++) {
    if (fuzzyMatch(lines[i], brand)) {
      const numMatch = lines[i].match(numberedPattern);
      if (numMatch) return parseInt(numMatch[1], 10);
      return i + 1;
    }
  }

  const idx = lower.indexOf(brandLower);
  if (idx === -1) return null;

  const before = lower.slice(0, idx);
  const sentenceCount = before.split(/[.!?]+/).filter((s) => s.trim()).length;
  return sentenceCount + 1;
}

function detectSentiment(text: string, brand: string): 'positive' | 'neutral' | 'negative' | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(brand.toLowerCase());
  if (idx === -1) return null;

  const context = lower.slice(Math.max(0, idx - 200), idx + brand.length + 200);

  const positiveWords = ['excellent', 'great', 'best', 'leading', 'innovative', 'powerful', 'top', 'outstanding', 'popular', 'recommended', 'trusted'];
  const negativeWords = ['poor', 'lacking', 'limited', 'outdated', 'expensive', 'slow', 'unreliable', 'concerns', 'criticized'];

  const posHits = positiveWords.filter((w) => context.includes(w)).length;
  const negHits = negativeWords.filter((w) => context.includes(w)).length;

  if (posHits > negHits) return 'positive';
  if (negHits > posHits) return 'negative';
  return 'neutral';
}

function extractCompetitors(text: string, brand: string): string[] {
  const competitors: string[] = [];
  const lines = text.split('\n');

  const numberedPattern = /^\s*\d+[.)]\s+\*{0,2}([^*\n:–-]+)/;

  for (const line of lines) {
    const match = line.match(numberedPattern);
    if (match) {
      const name = match[1].trim();
      if (name.length > 1 && name.length < 60 && !fuzzyMatch(name, brand)) {
        competitors.push(name);
      }
    }
  }

  return competitors.slice(0, 10);
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function extractCitationUrls(
  text: string,
  ownDomain: string,
  competitors: string[],
  providerUrls: Array<{ url: string; anchorText?: string | null }> = []
): CitationUrl[] {
  const seen = new Set<string>();
  const citations: CitationUrl[] = [];
  const ownDomainNorm = ownDomain.replace(/^www\./, '').toLowerCase();
  const competitorLower = competitors.map((c) => c.toLowerCase());

  function addUrl(rawUrl: string, anchorText: string | null) {
    const trimmed = rawUrl.replace(/[).,;:!?'"]+$/, '');
    if (seen.has(trimmed)) return;
    seen.add(trimmed);

    const domain = extractDomain(trimmed);
    if (!domain) return;

    const domainLower = domain.toLowerCase();
    const isOwnDomain = domainLower === ownDomainNorm || domainLower.endsWith(`.${ownDomainNorm}`);
    const isCompetitor = competitorLower.some(
      (c) => domainLower.includes(c.replace(/\s+/g, '').toLowerCase()) || c.includes(domainLower)
    );

    citations.push({ url: trimmed, domain, anchorText, isOwnDomain, isCompetitor });
  }

  for (const providerUrl of providerUrls) {
    addUrl(providerUrl.url, providerUrl.anchorText ?? null);
  }

  // Markdown links: [text](url)
  const mdLinkRe = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdLinkRe.exec(text)) !== null) {
    addUrl(m[2], m[1] || null);
  }

  // Footnote-style: [1]: url
  const footnoteRe = /\[\d+\]:\s*(https?:\/\/\S+)/g;
  while ((m = footnoteRe.exec(text)) !== null) {
    addUrl(m[1], null);
  }

  // Bare URLs not already captured by markdown links
  const bareUrlRe = /https?:\/\/[^\s)<>\]]+/g;
  while ((m = bareUrlRe.exec(text)) !== null) {
    addUrl(m[0], null);
  }

  return citations;
}

export function analyzeResponse(
  response: EngineResponse,
  brand: string,
  domain?: string
): MentionResult {
  const mentioned = fuzzyMatch(response.text, brand);
  const competitors = extractCompetitors(response.text, brand);
  const providerUrls = [
    ...(response.citations ?? []).map((url) => ({ url, anchorText: null })),
    ...(response.searchResults ?? []).map((result) => ({
      url: result.url,
      anchorText: result.title ?? null,
    })),
  ];
  const citationUrls = extractCitationUrls(
    response.text,
    domain ?? brand,
    competitors,
    providerUrls
  );

  return {
    engine: response.engine,
    prompt: response.prompt,
    mentioned,
    position: mentioned ? detectPosition(response.text, brand) : null,
    sentiment: mentioned ? detectSentiment(response.text, brand) : null,
    citationPresent: citationUrls.length > 0,
    citationUrls,
    descriptionAccurate: mentioned,
    competitors,
    rawSnippet: response.text.slice(0, 500),
    testedAt: response.testedAt,
  };
}

export function computeScore(results: MentionResult[]): number {
  if (results.length === 0) return 0;

  let score = 0;
  const total = results.length;

  for (const result of results) {
    if (result.mentioned) {
      score += 60;
      if (result.position !== null && result.position <= 3) score += 15;
      else if (result.position !== null && result.position <= 5) score += 10;
      if (result.sentiment === 'positive') score += 15;
      else if (result.sentiment === 'neutral') score += 5;
      if (result.citationPresent) score += 10;
    }
  }

  return Math.min(100, Math.round(score / total));
}

export function computeShareOfVoice(results: MentionResult[]): ShareOfVoiceData {
  let brandMentions = 0;
  let totalCompetitorMentions = 0;

  const byEngine = {} as ShareOfVoiceData['byEngine'];

  for (const engine of AI_ENGINES) {
    const engineResults = results.filter((r) => r.engine === engine);
    let engineBrand = 0;
    let engineCompetitors = 0;
    for (const r of engineResults) {
      if (r.mentioned) engineBrand++;
      engineCompetitors += r.competitors.length;
    }
    byEngine[engine] = {
      brandMentions: engineBrand,
      totalMentions: engineBrand + engineCompetitors,
      sovPct: engineBrand + engineCompetitors > 0
        ? Math.round((engineBrand / (engineBrand + engineCompetitors)) * 100)
        : 0,
    };
    brandMentions += engineBrand;
    totalCompetitorMentions += engineCompetitors;
  }

  const totalMentions = brandMentions + totalCompetitorMentions;

  return {
    brandMentions,
    totalMentions,
    shareOfVoicePct: totalMentions > 0 ? Math.round((brandMentions / totalMentions) * 100) : 0,
    byEngine,
  };
}

const POSITIVE_KEYWORDS = ['excellent', 'great', 'best', 'leading', 'innovative', 'powerful', 'top', 'outstanding', 'popular', 'recommended', 'trusted', 'reliable', 'strong', 'impressive'];
const NEGATIVE_KEYWORDS = ['poor', 'lacking', 'limited', 'outdated', 'expensive', 'slow', 'unreliable', 'concerns', 'criticized', 'weak', 'difficult', 'complex'];

export function computeSentimentSummary(results: MentionResult[], brand?: string): SentimentSummary {
  const mentionedResults = results.filter((r) => r.mentioned);
  let posCount = 0;
  let negCount = 0;
  let neuCount = 0;

  for (const r of mentionedResults) {
    if (r.sentiment === 'positive') posCount++;
    else if (r.sentiment === 'negative') negCount++;
    else neuCount++;
  }

  const total = posCount + negCount + neuCount;
  const positiveScore = total > 0 ? Math.round((posCount / total) * 100) : 50;

  const positives: string[] = [];
  const negatives: string[] = [];

  for (const r of mentionedResults) {
    const sentences = extractProfessionalSentimentSentences(r.rawSnippet, brand);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (positives.length < 5 && POSITIVE_KEYWORDS.some((kw) => lower.includes(kw)) && !positives.includes(sentence)) {
        positives.push(sentence);
      }
      if (negatives.length < 5 && NEGATIVE_KEYWORDS.some((kw) => lower.includes(kw)) && !negatives.includes(sentence)) {
        negatives.push(sentence);
      }
    }
  }

  const overallSentiment: SentimentSummary['overallSentiment'] =
    posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';

  return {
    overallSentiment,
    positiveScore,
    positives: polishSentimentBullets(positives, 'positive', {
      brandContext: brand,
      summary: { overallSentiment, positiveScore },
      limit: 5,
    }),
    negatives: polishSentimentBullets(negatives, 'negative', {
      brandContext: brand,
      summary: { overallSentiment, positiveScore },
      limit: 5,
    }),
  };
}

export function computeTopicPerformance(results: MentionResult[], promptsUsed: MentionPrompt[]): TopicPerformance[] {
  const topicMap = new Map<string, { mentioned: number; total: number; competitors: Map<string, number>; brandMentions: number; totalCompMentions: number }>();

  for (const prompt of promptsUsed) {
    const topic = prompt.topic ?? 'General';
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { mentioned: 0, total: 0, competitors: new Map(), brandMentions: 0, totalCompMentions: 0 });
    }
  }

  for (const r of results) {
    const topic = r.prompt.topic ?? 'General';
    const entry = topicMap.get(topic);
    if (!entry) continue;
    entry.total++;
    if (r.mentioned) {
      entry.mentioned++;
      entry.brandMentions++;
    }
    for (const comp of r.competitors) {
      entry.competitors.set(comp, (entry.competitors.get(comp) || 0) + 1);
      entry.totalCompMentions++;
    }
  }

  const topics: TopicPerformance[] = [];
  for (const [topic, data] of topicMap) {
    const promptCount = promptsUsed.filter((p) => (p.topic ?? 'General') === topic).length;
    const totalMentions = data.brandMentions + data.totalCompMentions;
    topics.push({
      topic,
      visibilityPct: data.total > 0 ? Math.round((data.mentioned / data.total) * 100) : 0,
      shareOfVoice: totalMentions > 0 ? Math.round((data.brandMentions / totalMentions) * 100) : 0,
      topBrands: Array.from(data.competitors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name),
      promptCount,
    });
  }

  return topics.sort((a, b) => b.visibilityPct - a.visibilityPct);
}

export function computeCompetitorLeaderboard(
  results: MentionResult[],
  promptsUsed: MentionPrompt[],
  options?: { inferredCompetitors?: InferredCompetitor[]; acceptedCompetitors?: AcceptedCompetitor[]; brand?: string }
): CompetitorLeaderboardEntry[] {
  if (options?.acceptedCompetitors) {
    return options.acceptedCompetitors.map((candidate) => ({
      name: candidate.name,
      count: candidate.mentionCount,
      visibilityPct: candidate.visibilityPct,
      avgPosition: candidate.avgPosition,
      engineCount: candidate.engineCount,
      relevanceScore: candidate.similarityScore,
      source: candidate.source,
    }));
  }

  const totalPrompts = promptsUsed.length;
  const compMap = new Map<string, {
    name: string;
    promptIds: Set<string>;
    engines: Set<string>;
    positions: number[];
    comparisonHits: number;
    recommendationHits: number;
    categoryHits: number;
    strongSourceHits: number;
    baseConfidence: number;
    isScanCandidate: boolean;
  }>();

  const inferredCompetitors = options?.inferredCompetitors ?? [];
  const brand = options?.brand ?? '';

  const confidenceWeight = { high: 6, medium: 4, low: 2 };

  for (const candidate of inferredCompetitors) {
    const cleanedName = normalizeCompetitorName(candidate.name);
    const key = competitorKey(cleanedName);
    if (!cleanedName || isLowQualityCompetitorName(cleanedName)) continue;
    if (brand && namesLikelySameBrand(cleanedName, brand)) continue;
    if (!compMap.has(key)) {
      compMap.set(key, {
        name: cleanedName,
        promptIds: new Set(),
        engines: new Set(),
        positions: [],
        comparisonHits: 0,
        recommendationHits: 0,
        categoryHits: 0,
        strongSourceHits: 0,
        baseConfidence: confidenceWeight[candidate.confidence],
        isScanCandidate: true,
      });
    }
  }

  for (const r of results) {
    for (const comp of r.competitors) {
      const cleanedName = normalizeCompetitorName(comp);
      const key = competitorKey(cleanedName);
      if (isLowQualityCompetitorName(cleanedName)) continue;
      if (brand && namesLikelySameBrand(cleanedName, brand)) continue;

      let entry = compMap.get(key);
      if (!entry) {
        entry = {
          name: cleanedName,
          promptIds: new Set(),
          engines: new Set(),
          positions: [],
          comparisonHits: 0,
          recommendationHits: 0,
          categoryHits: 0,
          strongSourceHits: 0,
          baseConfidence: 0,
          isScanCandidate: false,
        };
        compMap.set(key, entry);
      }
      entry.promptIds.add(r.prompt.id);
      entry.engines.add(r.engine);
      if (r.prompt.category === 'comparison') entry.comparisonHits += 1;
      if (r.prompt.category === 'recommendation' || r.prompt.category === 'buyer-intent') entry.recommendationHits += 1;
      if (r.prompt.category === 'category') entry.categoryHits += 1;
      if (r.prompt.source === 'competitor') entry.strongSourceHits += 1;
    }
  }

  // Compute avg positions for competitors by looking at numbered lists
  for (const r of results) {
    const lines = r.rawSnippet.split('\n');
    const numberedPattern = /^\s*(\d+)[.)]\s+\*{0,2}([^*\n:–-]+)/;
    for (const line of lines) {
      const match = line.match(numberedPattern);
      if (match) {
        const pos = parseInt(match[1], 10);
        const name = normalizeCompetitorName(match[2].trim());
        const entry = compMap.get(competitorKey(name));
        if (entry) entry.positions.push(pos);
      }
    }
  }

  const leaderboard: CompetitorLeaderboardEntry[] = [];
  for (const [, data] of compMap) {
    if (!data.isScanCandidate && isGenericPlatformBrand(data.name)) continue;

    const hasStrongSignals = data.isScanCandidate || data.strongSourceHits > 0 || data.comparisonHits > 0 || data.promptIds.size >= 2 || data.engines.size >= 2;
    if (!hasStrongSignals) continue;

    const relevanceScore =
      data.baseConfidence +
      data.strongSourceHits * 6 +
      data.comparisonHits * 4 +
      data.recommendationHits * 2 +
      data.categoryHits * 2 +
      data.promptIds.size * 3 +
      data.engines.size * 3;

    leaderboard.push({
      name: data.name,
      count: data.promptIds.size,
      visibilityPct: totalPrompts > 0 ? Math.round((data.promptIds.size / totalPrompts) * 100) : 0,
      avgPosition: data.positions.length > 0
        ? Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10
        : null,
      engineCount: data.engines.size,
      relevanceScore,
      source: data.isScanCandidate ? 'scan_inferred' : 'ai_validated',
    });
  }

  return leaderboard.sort((a, b) =>
    (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0) ||
    b.visibilityPct - a.visibilityPct ||
    (a.avgPosition ?? Number.POSITIVE_INFINITY) - (b.avgPosition ?? Number.POSITIVE_INFINITY) ||
    a.name.localeCompare(b.name)
  );
}

export { fuzzyMatch };
