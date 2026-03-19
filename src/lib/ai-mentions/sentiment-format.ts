import type { SentimentSummary } from '@/types/ai-mentions';

const SENTIMENT_FRAGMENT_PATTERNS = [
  /^here are\b/i,
  /^some of the\b/i,
  /^for\s+[A-Z]/,
  /^what\b/i,
  /^which\b/i,
  /^why\b/i,
  /^how\b/i,
  /^these\b/i,
  /^broken down by\b/i,
  /^best and most reputable options\b/i,
];

const SENTIMENT_HEADING_PATTERNS = [
  /^mission and vision$/i,
  /^product offerings$/i,
  /^customer satisfaction$/i,
  /^financial performance$/i,
  /^impact and outreach$/i,
  /^innovation and technology$/i,
  /^market presence$/i,
  /^online presence and community engagement$/i,
  /^are these real organizations$/i,
  /^what type of products\/boats$/i,
  /^what aspect interests you$/i,
  /^what aspects matter most to you$/i,
  /^what's your context$/i,
];

const SENTIMENT_VERB_PATTERN =
  /\b(is|are|was|were|offers?|provides?|focus(?:es|ed)?|helps?|serves?|delivers?|stands?|remains?|appears?|known|trusted|recommended|recognized|positions?|features?|specializes?)\b/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sentenceKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function humanizeBrandContext(brandContext?: string): string {
  if (!brandContext) return 'The brand';

  const withoutProtocol = brandContext.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const domainRoot = withoutProtocol.split('/')[0]?.split(':')[0] ?? withoutProtocol;
  const name = domainRoot
    .replace(/\.(com|net|org|co|io|ai|app|biz|us|ca|dev|shop|store)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) return 'The brand';

  return name.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeBrandTokens(brandContext?: string): string[] {
  if (!brandContext) return [];

  const label = humanizeBrandContext(brandContext);
  const compact = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const spaced = label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  return Array.from(new Set([compact, spaced, brandContext.toLowerCase().replace(/[^a-z0-9]+/g, '')])).filter(Boolean);
}

function mentionsBrand(value: string, brandContext?: string): boolean {
  if (!brandContext) return true;

  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const compact = normalized.replace(/\s+/g, '');

  return normalizeBrandTokens(brandContext).some((token) =>
    token.includes(' ')
      ? normalized.includes(token)
      : compact.includes(token)
  );
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const withCapital = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(withCapital) ? withCapital : `${withCapital}.`;
}

function cleanCandidateSentence(value: string, brandContext?: string): string | null {
  let cleaned = value
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\[(?:\d+|[^\]]{1,30})\](?:\[\d+\])*/g, ' ')
    .replace(/[`*_>#]/g, ' ')
    .replace(/\s+-\s+(?=[A-Z])/g, '. ')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[•*-]\s*/, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/:\s*$/, '');

  cleaned = normalizeWhitespace(cleaned).replace(/^"+|"+$/g, '');
  cleaned = cleaned.replace(/([.!?]){2,}$/g, '$1');

  if (!cleaned || cleaned.length < 30 || cleaned.length > 260) return null;
  if (cleaned.includes('?')) return null;
  if (SENTIMENT_HEADING_PATTERNS.some((pattern) => pattern.test(cleaned))) return null;
  if (SENTIMENT_FRAGMENT_PATTERNS.some((pattern) => pattern.test(cleaned))) return null;
  if (!SENTIMENT_VERB_PATTERN.test(cleaned)) return null;
  if (/^(?:[A-Z][\w.'&-]+,\s*){2,}[A-Z][\w.'&-]+/.test(cleaned)) return null;

  if (brandContext && !mentionsBrand(cleaned, brandContext) && !/^(?:the brand|the company|it)\b/i.test(cleaned)) {
    return null;
  }

  cleaned = cleaned
    .replace(/^known for\b/i, 'The brand is known for')
    .replace(/^recognized for\b/i, 'The brand is recognized for')
    .replace(/^praised for\b/i, 'The brand is praised for')
    .replace(/^trusted for\b/i, 'The brand is trusted for')
    .replace(/^offering\b/i, 'The brand offers');

  return ensureSentence(cleaned);
}

function splitIntoCandidateSentences(value: string): string[] {
  const normalized = normalizeWhitespace(
    value
      .replace(/\s*\n+\s*/g, ' ')
      .replace(/:\s*(?=\d+[.)]\s+)/g, '. ')
      .replace(/\s+\d+[.)]\s+/g, '. ')
      .replace(/#{1,6}\s*/g, '. ')
  );

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function uniqueSentences(values: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const value of values) {
    const key = sentenceKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(value);
  }

  return cleaned;
}

export function extractProfessionalSentimentSentences(
  value: string,
  brandContext?: string
): string[] {
  if (!value) return [];

  const candidates = splitIntoCandidateSentences(value);
  const brandAligned = brandContext
    ? candidates.filter((candidate) => mentionsBrand(candidate, brandContext))
    : candidates;
  const preferredCandidates = brandAligned.length > 0 ? brandAligned : candidates;

  return uniqueSentences(
    preferredCandidates
      .map((candidate) => cleanCandidateSentence(candidate, brandContext))
      .filter((candidate): candidate is string => Boolean(candidate))
  );
}

function fallbackSentimentSentence(
  kind: 'positive' | 'negative',
  brandContext: string | undefined,
  summary?: Pick<SentimentSummary, 'overallSentiment' | 'positiveScore'>
): string | null {
  const brandLabel = humanizeBrandContext(brandContext);

  if (kind === 'positive' && (summary?.positiveScore ?? 0) >= 55) {
    return `${brandLabel} is generally described positively and appears credible within its category.`;
  }

  if (
    kind === 'negative' &&
    (summary?.overallSentiment === 'negative' || (summary?.positiveScore ?? 100) < 45)
  ) {
    return `Some AI responses describe ${brandLabel} less favorably or provide weaker supporting detail than stronger competitors.`;
  }

  return null;
}

export function polishSentimentBullets(
  values: string[],
  kind: 'positive' | 'negative',
  options?: {
    brandContext?: string;
    summary?: Pick<SentimentSummary, 'overallSentiment' | 'positiveScore'>;
    limit?: number;
  }
): string[] {
  const polished = uniqueSentences(
    values
      .flatMap((value) => extractProfessionalSentimentSentences(value, options?.brandContext))
      .slice(0, options?.limit ?? 5)
  );

  if (polished.length > 0) return polished.slice(0, options?.limit ?? 5);

  const fallback = fallbackSentimentSentence(kind, options?.brandContext, options?.summary);
  return fallback ? [fallback] : [];
}
