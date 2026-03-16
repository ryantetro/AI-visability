import type { MentionResult, MentionPrompt, AIEngine, CitationUrl } from '@/types/ai-mentions';
import type { EngineResponse } from './engine-tester';

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
  competitors: string[]
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
  const citationUrls = extractCitationUrls(
    response.text,
    domain ?? brand,
    competitors
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

export { fuzzyMatch };
