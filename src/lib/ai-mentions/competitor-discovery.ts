import type { CrawlData } from '@/types/crawler';
import type {
  AcceptedCompetitor,
  BusinessProfile,
  CompetitorCandidate,
  CompetitorCandidateSource,
  CompetitorDiscoverySummary,
  CompetitorRejectReason,
  InferredCompetitor,
  MentionPrompt,
  MentionResult,
  RejectedCompetitorCandidate,
} from '@/types/ai-mentions';
import { buildBusinessProfile } from './prompt-generator';

const GENERIC_PLATFORM_BRANDS = new Set([
  'shopify',
  'woocommerce',
  'magento',
  'adobe commerce',
  'bigcommerce',
  'prestashop',
  'wix',
  'squarespace',
  'wordpress',
  'amazon',
  'ebay',
  'etsy',
  'salesforce commerce cloud',
  'oracle commerce',
]);

const LOW_QUALITY_NAMES = new Set([
  'cost',
  'cloud',
  'pricing',
  'shipping',
  'support',
  'enterprise',
  'software',
  'services',
  'service',
  'platform',
  'tool',
  'tools',
  'solution',
  'solutions',
  'industry focus',
  'product offerings',
  'customer satisfaction',
  'mission and vision',
  'market presence',
  'innovation and technology',
  'financial performance',
  'impact and outreach',
  'community engagement',
  'online presence and community engagement',
]);

const UI_TEXT_PATTERNS = [
  /^(mission and vision|product offerings|customer satisfaction|market presence|innovation and technology|financial performance|impact and outreach)$/i,
  /^(industry focus|company overview|product quality|brand reputation)$/i,
];

const QUESTION_PATTERNS = [
  /\?$/,
  /^(what|which|how|why|where|who|can|do|does|is|are|will|should)\b/i,
];

const VENDOR_APP_TERMS = [
  'analytics',
  'widget',
  'pixel',
  'wishlist',
  'mailchimp',
  'klaviyo',
  'rebuy',
  'doofinder',
  'hulk',
  'wisepops',
  'adoric',
  'redo',
  'chimpstatic',
  'shopify',
  'shopifysvc',
  'chat',
  'support',
  'plugin',
  'extension',
];

const WRONG_INDUSTRY_TERMS_BY_VERTICAL: Record<BusinessProfile['vertical'], string[]> = {
  marine_watersports: [
    'logistics', 'supply chain', 'freight', 'warehouse', 'fulfillment', 'carrier', 'shipping',
    'delivery', '3pl', 'brokerage', 'parcel',
  ],
  ecommerce_platform: ['marine', 'boat dealer', 'law firm', 'medical clinic'],
  logistics_supply_chain: ['wakeboard', 'watersports', 'boat parts', 'ski boat', 'retailer'],
  saas: ['freight', 'warehouse', 'wakeboard', 'marine parts'],
  local_service: ['shopify', 'woocommerce', 'magento', 'supply chain'],
  general: [],
};

const RETAIL_TERMS = ['dealer', 'dealership', 'retailer', 'shop', 'store', 'parts', 'inventory'];

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

export function normalizeCompetitorName(name: string): string {
  return name
    .replace(/^\*+|\*+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+[|:–-]\s+.*$/, '')
    .trim();
}

export function competitorKey(name: string): string {
  return normalizeCompetitorName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isGenericPlatformBrand(name: string): boolean {
  return GENERIC_PLATFORM_BRANDS.has(competitorKey(name));
}

export function isLowQualityCompetitorName(name: string): boolean {
  const cleaned = normalizeCompetitorName(name);
  const key = competitorKey(cleaned);
  if (!key || key.length < 3) return true;
  if (LOW_QUALITY_NAMES.has(key)) return true;
  if (/^(best|top|leading|recommended|alternative|option|platform|tool|solution)s?$/.test(key)) return true;
  if (cleaned.split(/\s+/).length === 1 && cleaned.length <= 4) return true;
  return false;
}

export function namesLikelySameBrand(a: string, b: string): boolean {
  const aKey = competitorKey(a);
  const bKey = competitorKey(b);
  if (!aKey || !bKey) return false;
  if (aKey === bKey) return true;
  if (aKey.includes(bKey) || bKey.includes(aKey)) return true;

  const aTokens = new Set(aKey.split(' ').filter(Boolean));
  const bTokens = new Set(bKey.split(' ').filter(Boolean));
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap > 0 && (overlap === aTokens.size || overlap === bTokens.size);
}

function geoAliases(profile: BusinessProfile): string[] {
  const aliases = new Set<string>();
  for (const geo of profile.geoSignals) {
    for (const token of tokenize(geo)) aliases.add(token);
    if (/salt lake city/i.test(geo)) {
      aliases.add('slc');
      aliases.add('utah');
    }
  }
  return Array.from(aliases);
}

function promptAlignmentScore(promptIds: Set<string>, promptsById: Map<string, MentionPrompt>, profile: BusinessProfile): number {
  let score = 0;
  const keywords = new Set([...profile.similarityKeywords, ...geoAliases(profile)]);

  for (const promptId of promptIds) {
    const prompt = promptsById.get(promptId);
    if (!prompt) continue;
    const lower = prompt.text.toLowerCase();
    if (prompt.category === 'comparison') score += 12;
    if (prompt.category === 'buyer-intent' || prompt.category === 'recommendation') score += 8;
    if (prompt.source === 'geo') score += 8;
    if (prompt.source === 'competitor') score += 10;
    if (prompt.source === 'product' || prompt.source === 'service') score += 8;
    if (profile.vertical === 'marine_watersports' && /\b(marine|boat|wakeboard|watersports|boat parts)\b/.test(lower)) score += 18;
    if (profile.siteModel === 'ecommerce_storefront' && /\b(shop|store|dealer|retailer|buy)\b/.test(lower)) score += 10;
    if (Array.from(keywords).some((keyword) => lower.includes(keyword))) score += 6;
  }

  return Math.min(100, score);
}

function looksLikeUiText(name: string): boolean {
  return UI_TEXT_PATTERNS.some((pattern) => pattern.test(name));
}

function looksLikeQuestionFragment(name: string): boolean {
  return QUESTION_PATTERNS.some((pattern) => pattern.test(name));
}

function looksLikeVendorOrApp(name: string): boolean {
  const lower = competitorKey(name);
  return VENDOR_APP_TERMS.some((term) => lower.includes(term));
}

function looksOrganizationLike(name: string): boolean {
  if (looksLikeUiText(name) || looksLikeQuestionFragment(name)) return false;
  const cleaned = normalizeCompetitorName(name);
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 5) return false;
  if (tokens.every((token) => token.length <= 2)) return false;
  if (/\b(inc|llc|co|company|group|marine|boats|motors|supply|sports|outdoors|gear|solutions)\b/i.test(cleaned)) return true;
  if (tokens.length === 1) return /^[A-Za-z][A-Za-z0-9&'.-]{4,24}$/.test(cleaned);
  return tokens.every((token) => /^[A-Za-z0-9&'.-]{2,24}$/.test(token));
}

function hasWrongIndustryTerms(name: string, profile: BusinessProfile): boolean {
  const lower = competitorKey(name);
  return WRONG_INDUSTRY_TERMS_BY_VERTICAL[profile.vertical].some((term) => lower.includes(term));
}

function categoryOverlapScore(name: string, profile: BusinessProfile): number {
  const tokens = new Set(tokenize(name));
  const profileTokens = new Set([...profile.similarityKeywords, ...geoAliases(profile)]);
  let overlap = 0;
  for (const token of tokens) {
    if (profileTokens.has(token)) overlap += 1;
  }
  const lower = competitorKey(name);
  for (const token of profileTokens) {
    if (token.length >= 4 && lower.includes(token)) {
      overlap += 1;
    }
  }
  let score = overlap * 16;
  if (profile.vertical === 'marine_watersports' && (
    Array.from(tokens).some((token) => ['marine', 'boat', 'boats', 'wake', 'wakeboard', 'surf', 'ski', 'watersports'].includes(token))
    || /\bmarine\b|boat|boats|wake|surf|ski|watersports/.test(lower)
  )) {
    score += 25;
  }
  if ((profile.businessType === 'dealer' || profile.businessType === 'retailer') && Array.from(tokens).some((token) => RETAIL_TERMS.includes(token))) {
    score += 12;
  }
  return Math.min(55, score);
}

function deriveRejectReason(
  name: string,
  profile: BusinessProfile,
  similarityScore: number,
): CompetitorRejectReason | null {
  if (isLowQualityCompetitorName(name)) return 'generic_term';
  if (looksLikeUiText(name)) return 'ui_text';
  if (looksLikeQuestionFragment(name)) return 'question_fragment';
  if (looksLikeVendorOrApp(name)) return 'vendor_or_app';
  if (hasWrongIndustryTerms(name, profile)) return 'wrong_industry';
  if (!looksOrganizationLike(name)) return 'too_weak';
  if (similarityScore < 30) return 'too_weak';
  return null;
}

interface CandidateAggregate {
  name: string;
  normalizedName: string;
  source: CompetitorCandidateSource;
  confidence: 'high' | 'medium' | 'low';
  mentionCount: number;
  promptIds: Set<string>;
  engines: Set<string>;
  positions: number[];
  evidence: Set<string>;
}

function aggregateCandidate(
  map: Map<string, CandidateAggregate>,
  rawName: string,
  source: CompetitorCandidateSource,
  confidence: CandidateAggregate['confidence'],
  evidence: string,
  promptId?: string,
  engine?: string,
  position?: number | null,
) {
  const cleaned = normalizeCompetitorName(rawName);
  const key = competitorKey(cleaned);
  if (!cleaned || !key) return;

  const existing = map.get(key);
  const next = existing ?? {
    name: cleaned,
    normalizedName: key,
    source,
    confidence,
    mentionCount: 0,
    promptIds: new Set<string>(),
    engines: new Set<string>(),
    positions: [],
    evidence: new Set<string>(),
  };

  if (source === 'ai_mentioned') next.mentionCount += 1;
  if (promptId) next.promptIds.add(promptId);
  if (engine) next.engines.add(engine);
  if (position != null) next.positions.push(position);
  if (evidence) next.evidence.add(evidence);

  const confidenceRank = { high: 3, medium: 2, low: 1 };
  if (confidenceRank[confidence] > confidenceRank[next.confidence]) next.confidence = confidence;
  if (next.source !== 'scan_candidate' && source === 'scan_candidate') next.source = source;
  if (next.source === 'ai_mentioned' && source === 'prompt_seed') next.source = source;

  map.set(key, next);
}

function toCandidate(
  aggregate: CandidateAggregate,
  totalPrompts: number,
  promptsById: Map<string, MentionPrompt>,
  profile: BusinessProfile,
): CompetitorCandidate {
  const similarityFromName = categoryOverlapScore(aggregate.name, profile);
  const alignment = promptAlignmentScore(aggregate.promptIds, promptsById, profile);
  const similarityScore = Math.min(
    100,
    similarityFromName +
      alignment +
      Math.min(aggregate.engines.size, 3) * 6 +
      Math.min(aggregate.promptIds.size, 3) * 5 +
      (aggregate.source !== 'ai_mentioned' ? 8 : 0)
  );

  return {
    name: aggregate.name,
    normalizedName: aggregate.normalizedName,
    source: aggregate.source,
    confidence: aggregate.confidence,
    similarityScore,
    mentionCount: aggregate.mentionCount,
    engineCount: aggregate.engines.size,
    promptCount: aggregate.promptIds.size,
    promptAlignmentScore: alignment,
    visibilityPct: totalPrompts > 0 ? Math.round((aggregate.promptIds.size / totalPrompts) * 100) : 0,
    avgPosition: aggregate.positions.length > 0
      ? Math.round((aggregate.positions.reduce((sum, value) => sum + value, 0) / aggregate.positions.length) * 10) / 10
      : null,
    evidence: Array.from(aggregate.evidence).slice(0, 4),
  };
}

function shouldAcceptCandidate(candidate: CompetitorCandidate, profile: BusinessProfile): boolean {
  if (candidate.source === 'ai_mentioned') {
    return candidate.similarityScore >= 65
      && candidate.promptAlignmentScore >= 25
      && (candidate.engineCount >= 2 || candidate.promptCount >= 2);
  }

  const nameScore = categoryOverlapScore(candidate.name, profile);
  return nameScore >= 40
    || (nameScore >= 25 && candidate.promptAlignmentScore >= 20)
    || (candidate.engineCount >= 2 && candidate.promptAlignmentScore >= 40 && candidate.similarityScore >= 65);
}

export function buildCompetitorLeaderboard(acceptedCompetitors: AcceptedCompetitor[]): AcceptedCompetitor[] {
  return acceptedCompetitors.slice().sort((a, b) =>
    (b.source === 'scan_inferred' ? 1 : 0) - (a.source === 'scan_inferred' ? 1 : 0) ||
    b.similarityScore - a.similarityScore ||
    b.visibilityPct - a.visibilityPct ||
    b.engineCount - a.engineCount ||
    a.name.localeCompare(b.name)
  );
}

export function discoverCompetitors(
  crawl: CrawlData,
  promptsUsed: MentionPrompt[],
  results: MentionResult[],
  businessProfile?: BusinessProfile,
): CompetitorDiscoverySummary {
  const profile = businessProfile ?? buildBusinessProfile(crawl);
  const promptsById = new Map(promptsUsed.map((prompt) => [prompt.id, prompt]));
  const candidates = new Map<string, CandidateAggregate>();
  const totalPrompts = promptsUsed.length;

  for (const seed of profile.scanCompetitorSeeds) {
    aggregateCandidate(candidates, seed, 'scan_candidate', 'high', 'Referenced from scanned site');
  }

  for (const prompt of promptsUsed) {
    if (prompt.source !== 'competitor') continue;
    const match = prompt.text.match(/compare to\s+(.+?)\??$/i);
    if (match?.[1]) {
      aggregateCandidate(candidates, match[1], 'prompt_seed', 'medium', `Prompt seed: ${prompt.text}`, prompt.id);
    }
  }

  for (const result of results) {
    const positionedCompetitors = result.competitorsWithPositions.length > 0
      ? result.competitorsWithPositions
      : result.competitors.map((name) => ({ name, position: null }));

    for (const competitor of positionedCompetitors) {
      aggregateCandidate(
        candidates,
        competitor.name,
        'ai_mentioned',
        result.prompt.category === 'comparison' ? 'medium' : 'low',
        `${result.engine}: ${result.prompt.text}`,
        result.prompt.id,
        result.engine,
        competitor.position,
      );
    }
  }

  const accepted: AcceptedCompetitor[] = [];
  const rejected: RejectedCompetitorCandidate[] = [];
  const allCandidates: CompetitorCandidate[] = [];

  for (const aggregate of candidates.values()) {
    const candidate = toCandidate(aggregate, totalPrompts, promptsById, profile);
    allCandidates.push(candidate);

    if (namesLikelySameBrand(candidate.name, profile.brand) || namesLikelySameBrand(candidate.name, profile.domain)) {
      rejected.push({ ...candidate, reason: 'same_as_brand' });
      continue;
    }

    if (isGenericPlatformBrand(candidate.name) && profile.vertical !== 'ecommerce_platform') {
      rejected.push({ ...candidate, reason: 'wrong_industry' });
      continue;
    }

    const rejectReason = deriveRejectReason(candidate.name, profile, candidate.similarityScore);
    if (rejectReason) {
      rejected.push({ ...candidate, reason: rejectReason });
      continue;
    }

    if (!shouldAcceptCandidate(candidate, profile)) {
      rejected.push({ ...candidate, reason: 'too_weak' });
      continue;
    }

    accepted.push({
      ...candidate,
      source: candidate.source === 'ai_mentioned' ? 'ai_validated' : 'scan_inferred',
    });
  }

  return {
    version: 1,
    strictScanFirst: true,
    businessProfile: profile,
    candidates: allCandidates.sort((a, b) => b.similarityScore - a.similarityScore || b.visibilityPct - a.visibilityPct),
    acceptedCompetitors: buildCompetitorLeaderboard(accepted).slice(0, 20),
    rejectedCandidates: rejected.sort((a, b) => b.similarityScore - a.similarityScore || a.name.localeCompare(b.name)).slice(0, 40),
  };
}

export function discoverScanCompetitors(
  crawl: CrawlData,
  promptsUsed: MentionPrompt[],
  brand: string,
  industry: string
): InferredCompetitor[] {
  const profile = buildBusinessProfile(crawl);
  const discovery = discoverCompetitors(
    crawl,
    promptsUsed,
    [],
    {
      ...profile,
      brand,
      industry,
    }
  );

  return discovery.acceptedCompetitors
    .filter((candidate) => candidate.source === 'scan_inferred')
    .map((candidate) => ({
      name: candidate.name,
      confidence: candidate.confidence,
      source: candidate.evidence.some((evidence) => evidence.startsWith('Prompt seed'))
        ? 'prompt_seed'
        : 'scan_candidate',
    }));
}
