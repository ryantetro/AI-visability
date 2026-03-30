import type {
  AIEngine,
  MentionResult,
  MentionPrompt,
  CitationUrl,
  AcceptedCompetitor,
  ShareOfVoiceData,
  SentimentSummary,
  TopicPerformance,
  CompetitorLeaderboardEntry,
  InferredCompetitor,
  CompetitorPosition,
  MentionSentiment,
  MentionType,
  PositionContext,
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

export const ENGINE_WEIGHTS: Record<AIEngine, number> = {
  chatgpt: 1.4,
  perplexity: 1.1,
  gemini: 1.0,
  claude: 0.9,
  grok: 1.0,
};

const POSITIVE_KEYWORDS = [
  'excellent', 'great', 'best', 'leading', 'innovative', 'powerful', 'top', 'outstanding',
  'popular', 'recommended', 'trusted', 'reliable', 'strong', 'impressive', 'credible',
];
const NEGATIVE_KEYWORDS = [
  'poor', 'lacking', 'limited', 'outdated', 'expensive', 'slow', 'unreliable', 'concerns',
  'criticized', 'weak', 'difficult', 'complex', 'bad', 'worse',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countKeywordHits(context: string, keywords: string[]): number {
  return keywords.filter((keyword) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
    return pattern.test(context);
  }).length;
}

function clampStrength(value: number | null | undefined, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(10, Math.round(value as number)));
}

function getRawSentiment(result: Pick<MentionResult, 'sentimentLabel' | 'sentiment'>): MentionSentiment | null {
  return result.sentimentLabel ?? result.sentiment;
}

export function normalizeLegacySentiment(sentiment: MentionSentiment | null): MentionResult['sentiment'] {
  if (sentiment === 'mixed') return 'neutral';
  return sentiment;
}

function inferStrengthFromSentiment(sentiment: MentionSentiment | null, mentioned: boolean): number {
  if (!mentioned || !sentiment) return 0;
  if (sentiment === 'positive' || sentiment === 'negative') return 7;
  if (sentiment === 'mixed') return 5;
  return 4;
}

function normalizeDomainHint(value?: string): string {
  return value
    ?.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0] ?? '';
}

function domainStem(value?: string): string {
  return normalizeDomainHint(value)
    .split('.')[0]
    .replace(/[-_]+/g, ' ')
    .trim();
}

export function fuzzyMatch(text: string, brand: string): boolean {
  const lower = text.toLowerCase();
  const brandLower = brand.toLowerCase();

  if (lower.includes(brandLower)) return true;

  const noPunctuation = brandLower.replace(/[^a-z0-9\s]/g, '');
  if (noPunctuation && lower.includes(noPunctuation)) return true;

  const noSpaces = brandLower.replace(/\s+/g, '');
  if (noSpaces.length > 3 && lower.includes(noSpaces)) return true;

  return false;
}

function sentenceIndexBefore(text: string, idx: number): number {
  return text
    .slice(0, idx)
    .split(/[.!?]+/)
    .filter((segment) => segment.trim()).length;
}

function detectPosition(text: string, brand: string): number | null {
  const lower = text.toLowerCase();
  const lines = lower.split('\n').filter((line) => line.trim());
  const numberedPattern = /^\s*(\d+)[.)]\s/;

  for (let i = 0; i < lines.length; i++) {
    if (fuzzyMatch(lines[i], brand)) {
      const numMatch = lines[i].match(numberedPattern);
      if (numMatch) return parseInt(numMatch[1], 10);
      return i + 1;
    }
  }

  const idx = lower.indexOf(brand.toLowerCase());
  if (idx === -1) return null;
  return sentenceIndexBefore(lower, idx) + 1;
}

function detectSentiment(text: string, matchHint: string): MentionSentiment | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(matchHint.toLowerCase());
  if (idx === -1) return null;

  const context = lower.slice(Math.max(0, idx - 220), idx + matchHint.length + 220);
  const posHits = countKeywordHits(context, POSITIVE_KEYWORDS);
  const negHits = countKeywordHits(context, NEGATIVE_KEYWORDS);

  if (posHits > 0 && negHits > 0) return 'mixed';
  if (posHits > 0) return 'positive';
  if (negHits > 0) return 'negative';
  return 'neutral';
}

function extractRepresentativeQuote(text: string, brand: string, ownDomain?: string): string | null {
  const brandLower = brand.toLowerCase();
  const stem = domainStem(ownDomain);
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 20 && sentence.length <= 260);

  const preferred = sentences.find((sentence) => {
    const lower = sentence.toLowerCase();
    return lower.includes(brandLower) || (stem.length >= 4 && lower.includes(stem));
  });

  return preferred ?? sentences[0] ?? null;
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function dedupeCompetitors(entries: CompetitorPosition[]): CompetitorPosition[] {
  const map = new Map<string, CompetitorPosition>();

  for (const entry of entries) {
    const normalized = normalizeCompetitorName(entry.name);
    const key = competitorKey(normalized);
    if (!normalized || isLowQualityCompetitorName(normalized)) continue;

    const existing = map.get(key);
    if (!existing || (existing.position == null && entry.position != null)) {
      map.set(key, { name: normalized, position: entry.position });
    }
  }

  return Array.from(map.values()).slice(0, 10);
}

function extractCompetitorEntries(text: string, brand: string): CompetitorPosition[] {
  const entries: CompetitorPosition[] = [];
  const lines = text.split('\n');
  const numberedPattern = /^\s*(\d+)[.)]\s+\*{0,2}([^*\n:–-]+)/;

  for (const line of lines) {
    const match = line.match(numberedPattern);
    if (!match) continue;
    const name = match[2].trim();
    if (name.length < 2 || name.length > 80 || fuzzyMatch(name, brand)) continue;
    entries.push({
      name,
      position: parseInt(match[1], 10),
    });
  }

  return dedupeCompetitors(entries);
}

function detectIndirectMention(
  text: string,
  ownDomain: string | undefined,
  citationUrls: CitationUrl[],
): boolean {
  if (citationUrls.some((citation) => citation.isOwnDomain)) return true;
  const stem = domainStem(ownDomain);
  if (stem.length < 4) return false;
  return text.toLowerCase().includes(stem.toLowerCase());
}

function detectPositionContext(
  text: string,
  brand: string,
  mentionType: MentionType,
  position: number | null,
): PositionContext {
  if (mentionType === 'not_mentioned') return 'absent';
  if (position !== null) return 'listed_ranking';
  if (mentionType === 'indirect') return 'passing';

  const lower = text.toLowerCase();
  const idx = lower.indexOf(brand.toLowerCase());
  if (idx === -1) return 'passing';
  return sentenceIndexBefore(lower, idx) <= 1 ? 'prominent' : 'passing';
}

function rankPoints(position: number): number {
  if (position === 1) return 10;
  if (position === 2) return 7;
  if (position === 3) return 5;
  if (position === 4) return 3;
  return 2;
}

function scorePosition(position: number): number {
  if (position === 1) return 25;
  if (position === 2) return 18;
  if (position === 3) return 12;
  if (position === 4) return 8;
  if (position === 5) return 5;
  return 2;
}

function getCompetitorEntries(result: Pick<MentionResult, 'competitorsWithPositions' | 'competitors'>): CompetitorPosition[] {
  if (result.competitorsWithPositions.length > 0) return result.competitorsWithPositions;
  return result.competitors.map((name) => ({ name, position: null }));
}

function getBrandProminence(result: Pick<MentionResult, 'mentionType' | 'position' | 'positionContext'>): number {
  if (result.mentionType === 'not_mentioned') return 0;
  if (result.mentionType === 'indirect') return 2;
  if (result.position != null) return rankPoints(result.position);
  if (result.positionContext === 'prominent') return 6;
  return 3;
}

function getCompetitorProminence(entry: CompetitorPosition): number {
  if (entry.position != null) return rankPoints(entry.position);
  return 3;
}

function aggregateSentimentBuckets(
  results: Array<Pick<MentionResult, 'mentioned' | 'sentimentLabel' | 'sentiment' | 'sentimentStrength'>>
) {
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let mixed = 0;
  let total = 0;

  for (const result of results) {
    if (!result.mentioned) continue;
    const sentiment = getRawSentiment(result);
    if (!sentiment) continue;
    const strength = clampStrength(
      result.sentimentStrength,
      inferStrengthFromSentiment(sentiment, true)
    );
    if (strength <= 0) continue;
    total += strength;
    if (sentiment === 'positive') positive += strength;
    else if (sentiment === 'negative') negative += strength;
    else if (sentiment === 'mixed') mixed += strength;
    else neutral += strength;
  }

  return { positive, neutral, negative, mixed, total };
}

function aggregateDetailedSentiment(
  results: Array<Pick<MentionResult, 'mentioned' | 'sentimentLabel' | 'sentiment' | 'sentimentStrength'>>
): MentionSentiment | 'not-found' {
  const buckets = aggregateSentimentBuckets(results);
  if (buckets.total === 0) return 'not-found';

  const max = Math.max(buckets.positive, buckets.neutral, buckets.negative, buckets.mixed);
  if (max === buckets.mixed && buckets.mixed > 0) return 'mixed';
  if (max === buckets.positive && buckets.positive > 0) return 'positive';
  if (max === buckets.negative && buckets.negative > 0) return 'negative';
  return 'neutral';
}

function sortQuotesByStrength(
  results: Array<Pick<MentionResult, 'keyQuote' | 'rawSnippet' | 'sentimentStrength'>>,
  brand?: string,
): string[] {
  const seen = new Set<string>();
  return results
    .slice()
    .sort((a, b) => (b.sentimentStrength ?? 0) - (a.sentimentStrength ?? 0))
    .map((result) => (result.keyQuote ?? extractRepresentativeQuote(result.rawSnippet, brand ?? '', brand))?.trim() ?? '')
    .filter((quote) => {
      if (!quote || seen.has(quote)) return false;
      seen.add(quote);
      return true;
    });
}

export function extractCitationUrls(
  text: string,
  ownDomain: string,
  competitors: string[],
  providerUrls: Array<{ url: string; anchorText?: string | null }> = [],
): CitationUrl[] {
  const seen = new Set<string>();
  const citations: CitationUrl[] = [];
  const ownDomainNorm = ownDomain.replace(/^www\./, '').toLowerCase();
  const competitorLower = competitors.map((competitor) => competitor.toLowerCase());

  function addUrl(rawUrl: string, anchorText: string | null) {
    const trimmed = rawUrl.replace(/[).,;:!?'"]+$/, '');
    if (seen.has(trimmed)) return;
    seen.add(trimmed);

    const domain = extractDomain(trimmed);
    if (!domain) return;

    const domainLower = domain.toLowerCase();
    const isOwnDomain = domainLower === ownDomainNorm || domainLower.endsWith(`.${ownDomainNorm}`);
    const isCompetitor = competitorLower.some(
      (competitor) => domainLower.includes(competitor.replace(/\s+/g, '')) || competitor.includes(domainLower)
    );

    citations.push({ url: trimmed, domain, anchorText, isOwnDomain, isCompetitor });
  }

  for (const providerUrl of providerUrls) {
    addUrl(providerUrl.url, providerUrl.anchorText ?? null);
  }

  const mdLinkRe = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRe.exec(text)) !== null) {
    addUrl(match[2], match[1] || null);
  }

  const footnoteRe = /\[\d+\]:\s*(https?:\/\/\S+)/g;
  while ((match = footnoteRe.exec(text)) !== null) {
    addUrl(match[1], null);
  }

  const bareUrlRe = /https?:\/\/[^\s)<>\]]+/g;
  while ((match = bareUrlRe.exec(text)) !== null) {
    addUrl(match[0], null);
  }

  return citations;
}

export function analyzeResponse(
  response: EngineResponse,
  brand: string,
  domain?: string,
): MentionResult {
  const competitorsWithPositions = extractCompetitorEntries(response.text, brand);
  const competitors = competitorsWithPositions.map((entry) => entry.name);
  const providerUrls = [
    ...(response.citations ?? []).map((url) => ({ url, anchorText: null })),
    ...(response.searchResults ?? []).map((result) => ({
      url: result.url,
      anchorText: result.title ?? null,
    })),
  ];
  const citationUrls = extractCitationUrls(response.text, domain ?? brand, competitors, providerUrls);

  const directMentioned = fuzzyMatch(response.text, brand);
  const indirectMentioned = !directMentioned && detectIndirectMention(response.text, domain, citationUrls);
  const mentionType: MentionType = directMentioned
    ? 'direct'
    : indirectMentioned
      ? 'indirect'
      : 'not_mentioned';
  const mentioned = mentionType !== 'not_mentioned';
  const position = mentionType === 'direct' ? detectPosition(response.text, brand) : null;
  const sentimentHint = directMentioned ? brand : domainStem(domain);
  const sentimentLabel = mentioned && sentimentHint
    ? detectSentiment(response.text, sentimentHint)
    : null;
  const positionContext = detectPositionContext(response.text, brand, mentionType, position);
  const descriptionAccuracy = mentioned ? 'accurate' as const : null;
  const keyQuote = mentioned ? extractRepresentativeQuote(response.text, brand, domain) : null;

  return {
    engine: response.engine,
    prompt: response.prompt,
    mentioned,
    mentionType,
    position,
    positionContext,
    sentiment: mentioned ? normalizeLegacySentiment(sentimentLabel) : null,
    sentimentLabel,
    sentimentStrength: clampStrength(
      null,
      inferStrengthFromSentiment(sentimentLabel, mentioned)
    ),
    sentimentReasoning: null,
    keyQuote,
    citationPresent: citationUrls.length > 0,
    citationUrls,
    descriptionAccurate: descriptionAccuracy === 'accurate',
    descriptionAccuracy,
    competitors,
    competitorsWithPositions,
    rawSnippet: response.text.slice(0, 500),
    testedAt: response.testedAt,
    analysisSource: 'heuristic',
  };
}

function computeResponseScore(result: MentionResult): number {
  if (result.mentionType === 'not_mentioned') return 0;

  let score = 0;

  if (result.mentionType === 'direct') score += 35;
  else if (result.mentionType === 'indirect') score += 15;

  if (result.position != null) {
    score += scorePosition(result.position);
  }

  const sentiment = getRawSentiment(result);
  const sentimentStrength = clampStrength(
    result.sentimentStrength,
    inferStrengthFromSentiment(sentiment, result.mentioned)
  );
  if (sentiment === 'positive') score += 15 * (sentimentStrength / 10);
  else if (sentiment === 'neutral' || sentiment === 'mixed') score += 5 * (sentimentStrength / 10);

  const hasOwnDomainCitation = result.citationPresent && result.citationUrls.some((citation) => citation.isOwnDomain);
  if (hasOwnDomainCitation) score += 15;
  else if (result.citationPresent) score += 5;

  if (result.descriptionAccuracy === 'accurate') score += 10;
  else if (result.descriptionAccuracy === 'partial') score += 5;

  return Math.min(100, score);
}

export function computeWeightedScore(results: MentionResult[]): number {
  if (results.length === 0) return 0;

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const result of results) {
    const weight = ENGINE_WEIGHTS[result.engine] ?? 1;
    weightedTotal += computeResponseScore(result) * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.min(100, Math.round(weightedTotal / totalWeight));
}

export const computeScore = computeWeightedScore;

export function computeShareOfVoice(results: MentionResult[]): ShareOfVoiceData {
  let brandMentions = 0;
  let totalMentions = 0;
  let brandProminence = 0;
  let totalProminence = 0;
  let weightedSovSum = 0;
  let totalWeightedEngines = 0;

  const byEngine = {} as ShareOfVoiceData['byEngine'];

  for (const engine of AI_ENGINES) {
    const engineResults = results.filter((result) => result.engine === engine);
    let engineBrandMentions = 0;
    let engineCompetitorMentions = 0;
    let engineBrandProminence = 0;
    let engineCompetitorProminence = 0;

    for (const result of engineResults) {
      if (result.mentioned) engineBrandMentions += 1;
      engineBrandProminence += getBrandProminence(result);

      const competitorEntries = getCompetitorEntries(result);
      engineCompetitorMentions += competitorEntries.length;
      engineCompetitorProminence += competitorEntries.reduce(
        (sum, competitor) => sum + getCompetitorProminence(competitor),
        0
      );
    }

    const engineTotalMentions = engineBrandMentions + engineCompetitorMentions;
    const engineTotalProminence = engineBrandProminence + engineCompetitorProminence;
    const engineSovPct = engineTotalProminence > 0
      ? Math.round((engineBrandProminence / engineTotalProminence) * 100)
      : 0;

    byEngine[engine] = {
      brandMentions: engineBrandMentions,
      totalMentions: engineTotalMentions,
      brandProminence: Math.round(engineBrandProminence * 10) / 10,
      totalProminence: Math.round(engineTotalProminence * 10) / 10,
      sovPct: engineSovPct,
    };

    brandMentions += engineBrandMentions;
    totalMentions += engineTotalMentions;
    brandProminence += engineBrandProminence;
    totalProminence += engineTotalProminence;

    if (engineTotalProminence > 0) {
      weightedSovSum += engineSovPct * (ENGINE_WEIGHTS[engine] ?? 1);
      totalWeightedEngines += ENGINE_WEIGHTS[engine] ?? 1;
    }
  }

  return {
    brandMentions,
    totalMentions,
    brandProminence: Math.round(brandProminence * 10) / 10,
    totalProminence: Math.round(totalProminence * 10) / 10,
    shareOfVoicePct: totalWeightedEngines > 0
      ? Math.round(weightedSovSum / totalWeightedEngines)
      : 0,
    byEngine,
  };
}

export function computeSentimentSummary(results: MentionResult[], brand?: string): SentimentSummary {
  const mentionedResults = results.filter((result) => result.mentioned && getRawSentiment(result));
  const totalBuckets = aggregateSentimentBuckets(mentionedResults);
  const positiveEquivalent = totalBuckets.positive + (totalBuckets.mixed * 0.5);
  const positiveScore = totalBuckets.total > 0
    ? Math.round((positiveEquivalent / totalBuckets.total) * 100)
    : 50;

  const overallDetailed = aggregateDetailedSentiment(mentionedResults);
  const overallSentiment: SentimentSummary['overallSentiment'] =
    overallDetailed === 'positive'
      ? 'positive'
      : overallDetailed === 'negative'
        ? 'negative'
        : 'neutral';

  const keyPositiveQuotes = sortQuotesByStrength(
    mentionedResults.filter((result) => getRawSentiment(result) === 'positive'),
    brand
  ).slice(0, 5);
  const keyNegativeQuotes = sortQuotesByStrength(
    mentionedResults.filter((result) => getRawSentiment(result) === 'negative'),
    brand
  ).slice(0, 5);

  const sentimentBreakdown = AI_ENGINES.reduce((acc, engine) => {
    const engineResults = mentionedResults.filter((result) => result.engine === engine);
    const engineBuckets = aggregateSentimentBuckets(engineResults);
    const sampleQuote = sortQuotesByStrength(engineResults, brand)[0] ?? null;
    acc[engine] = {
      sentiment: aggregateDetailedSentiment(engineResults),
      averageStrength: engineResults.length > 0
        ? Math.round((engineBuckets.total / engineResults.length) * 10) / 10
        : 0,
      sampleQuote,
    };
    return acc;
  }, {} as SentimentSummary['sentimentBreakdown']);

  return {
    overallSentiment,
    positiveScore,
    averageStrength: mentionedResults.length > 0
      ? Math.round((totalBuckets.total / mentionedResults.length) * 10) / 10
      : 0,
    sentimentBreakdown,
    keyPositiveQuotes,
    keyNegativeQuotes,
    positives: keyPositiveQuotes,
    negatives: keyNegativeQuotes,
  };
}

export function computeTopicPerformance(results: MentionResult[], promptsUsed: MentionPrompt[]): TopicPerformance[] {
  const topicMap = new Map<string, {
    mentioned: number;
    total: number;
    competitors: Map<string, number>;
    brandProminence: number;
    competitorProminence: number;
  }>();

  for (const prompt of promptsUsed) {
    const topic = prompt.topic ?? 'General';
    if (!topicMap.has(topic)) {
      topicMap.set(topic, {
        mentioned: 0,
        total: 0,
        competitors: new Map(),
        brandProminence: 0,
        competitorProminence: 0,
      });
    }
  }

  for (const result of results) {
    const topic = result.prompt.topic ?? 'General';
    const entry = topicMap.get(topic);
    if (!entry) continue;

    entry.total += 1;
    if (result.mentioned) entry.mentioned += 1;
    entry.brandProminence += getBrandProminence(result);

    for (const competitor of getCompetitorEntries(result)) {
      entry.competitors.set(competitor.name, (entry.competitors.get(competitor.name) || 0) + 1);
      entry.competitorProminence += getCompetitorProminence(competitor);
    }
  }

  const topics: TopicPerformance[] = [];
  for (const [topic, data] of topicMap.entries()) {
    const promptCount = promptsUsed.filter((prompt) => (prompt.topic ?? 'General') === topic).length;
    const totalProminence = data.brandProminence + data.competitorProminence;
    topics.push({
      topic,
      visibilityPct: data.total > 0 ? Math.round((data.mentioned / data.total) * 100) : 0,
      shareOfVoice: totalProminence > 0
        ? Math.round((data.brandProminence / totalProminence) * 100)
        : 0,
      topBrands: Array.from(data.competitors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name),
      promptCount,
    });
  }

  return topics.sort((a, b) => b.visibilityPct - a.visibilityPct || b.shareOfVoice - a.shareOfVoice);
}

function fallbackCompetitorPositionsFromSnippet(result: MentionResult): CompetitorPosition[] {
  if (result.competitorsWithPositions.length > 0) return result.competitorsWithPositions;

  const lines = result.rawSnippet.split('\n');
  const numberedPattern = /^\s*(\d+)[.)]\s+\*{0,2}([^*\n:–-]+)/;
  const entries: CompetitorPosition[] = [];

  for (const line of lines) {
    const match = line.match(numberedPattern);
    if (!match) continue;
    const name = normalizeCompetitorName(match[2].trim());
    if (!name || isLowQualityCompetitorName(name)) continue;
    entries.push({
      name,
      position: parseInt(match[1], 10),
    });
  }

  return dedupeCompetitors(entries);
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

  for (const result of results) {
    const positionedCompetitors = fallbackCompetitorPositionsFromSnippet(result);
    for (const competitor of positionedCompetitors) {
      const cleanedName = normalizeCompetitorName(competitor.name);
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

      entry.promptIds.add(result.prompt.id);
      entry.engines.add(result.engine);
      if (competitor.position != null) entry.positions.push(competitor.position);
      if (result.prompt.category === 'comparison') entry.comparisonHits += 1;
      if (result.prompt.category === 'recommendation' || result.prompt.category === 'buyer-intent') {
        entry.recommendationHits += 1;
      }
      if (result.prompt.category === 'category') entry.categoryHits += 1;
      if (result.prompt.source === 'competitor') entry.strongSourceHits += 1;
    }
  }

  const leaderboard: CompetitorLeaderboardEntry[] = [];
  for (const [, data] of compMap) {
    if (!data.isScanCandidate && isGenericPlatformBrand(data.name)) continue;

    const hasStrongSignals = data.isScanCandidate
      || data.strongSourceHits > 0
      || data.comparisonHits > 0
      || data.promptIds.size >= 2
      || data.engines.size >= 2;
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
        ? Math.round((data.positions.reduce((sum, value) => sum + value, 0) / data.positions.length) * 10) / 10
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
