export type AIEngine = 'chatgpt' | 'perplexity' | 'gemini' | 'claude' | 'grok';
export type MentionType = 'direct' | 'indirect' | 'not_mentioned';
export type MentionSentiment = 'positive' | 'neutral' | 'negative' | 'mixed';
export type PositionContext = 'listed_ranking' | 'prominent' | 'passing' | 'absent';
export type DescriptionAccuracy = 'accurate' | 'partial' | 'inaccurate';
export type AnalysisSource = 'llm' | 'heuristic';

export interface MentionPrompt {
  id: string;
  text: string;
  category: 'direct' | 'category' | 'comparison' | 'recommendation'
    | 'workflow' | 'use-case' | 'problem-solution' | 'buyer-intent';
  industry: string;
  location?: string;
  brand?: string;
  topic?: string;
  source?: string;
}

export type BusinessVertical =
  | 'marine_watersports'
  | 'ecommerce_platform'
  | 'logistics_supply_chain'
  | 'saas'
  | 'local_service'
  | 'general';

export type BusinessType =
  | 'dealer'
  | 'retailer'
  | 'manufacturer'
  | 'software_platform'
  | 'service_business'
  | 'local_business'
  | 'unknown';

export type SiteModel =
  | 'ecommerce_storefront'
  | 'software_platform'
  | 'service_site'
  | 'content_site'
  | 'unknown';

export interface BusinessProfile {
  brand: string;
  domain: string;
  industry: string;
  location?: string;
  vertical: BusinessVertical;
  businessType: BusinessType;
  siteModel: SiteModel;
  categoryPhrases: string[];
  productCategories: string[];
  serviceSignals: string[];
  geoSignals: string[];
  similarityKeywords: string[];
  scanCompetitorSeeds: string[];
}

export interface SiteContentProfile {
  products: string[];
  services: string[];
  features: string[];
  usps: string[];
  competitors: string[];
  targetAudience: string[];
  geoAreas: string[];
  pricingTiers: string[];
  faqQueries: string[];
  industryTerms: string[];
  blogTopics: string[];
  useCases: string[];
  problemStatements: string[];
  integrations: string[];
  actionCapabilities: string[];
}

export interface CitationUrl {
  url: string;
  domain: string;
  anchorText: string | null;
  isOwnDomain: boolean;
  isCompetitor: boolean;
}

export interface CompetitorPosition {
  name: string;
  position: number | null;
}

export interface MentionResult {
  engine: AIEngine;
  prompt: MentionPrompt;
  mentioned: boolean;
  mentionType: MentionType;
  position: number | null;
  positionContext: PositionContext | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentimentLabel: MentionSentiment | null;
  sentimentStrength: number;
  sentimentReasoning: string | null;
  keyQuote: string | null;
  citationPresent: boolean;
  citationUrls: CitationUrl[];
  descriptionAccurate: boolean;
  descriptionAccuracy: DescriptionAccuracy | null;
  competitors: string[];
  competitorsWithPositions: CompetitorPosition[];
  rawSnippet: string;
  testedAt: number;
  analysisSource: AnalysisSource;
}

export interface EngineBreakdown {
  mentioned: number;
  total: number;
  avgPosition: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | 'not-found';
}

export type MentionEngineStatusCode = 'complete' | 'not_configured' | 'not_backfilled' | 'error';

export interface MentionEngineStatus {
  status: MentionEngineStatusCode;
  configured: boolean;
  provider: string;
  model: string | null;
  testedPrompts: number;
  successfulResponses: number;
  failedPrompts: number;
  lastTestedAt: number | null;
  errorMessage: string | null;
}

export interface TopicPerformance {
  topic: string;
  visibilityPct: number;
  shareOfVoice: number;
  topBrands: string[];
  promptCount: number;
}

export interface SentimentSummary {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  positiveScore: number;
  averageStrength: number;
  sentimentBreakdown: Record<AIEngine, {
    sentiment: MentionSentiment | 'not-found';
    averageStrength: number;
    sampleQuote: string | null;
  }>;
  keyPositiveQuotes: string[];
  keyNegativeQuotes: string[];
  positives: string[];
  negatives: string[];
}

export interface ShareOfVoiceData {
  brandMentions: number;
  totalMentions: number;
  brandProminence: number;
  totalProminence: number;
  shareOfVoicePct: number;
  byEngine: Record<AIEngine, {
    brandMentions: number;
    totalMentions: number;
    brandProminence: number;
    totalProminence: number;
    sovPct: number;
  }>;
}

export interface CompetitorLeaderboardEntry {
  name: string;
  count: number;
  visibilityPct: number;
  avgPosition: number | null;
  engineCount?: number;
  relevanceScore?: number;
  source?: 'ai_validated' | 'tracked' | 'scan_inferred';
}

export interface InferredCompetitor {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'scan_candidate' | 'prompt_seed';
}

export type CompetitorCandidateSource = 'scan_candidate' | 'prompt_seed' | 'ai_mentioned';

export type CompetitorRejectReason =
  | 'generic_term'
  | 'ui_text'
  | 'question_fragment'
  | 'vendor_or_app'
  | 'wrong_industry'
  | 'too_weak'
  | 'same_as_brand';

export interface CompetitorCandidate {
  name: string;
  normalizedName: string;
  source: CompetitorCandidateSource;
  confidence: 'high' | 'medium' | 'low';
  similarityScore: number;
  mentionCount: number;
  engineCount: number;
  promptCount: number;
  promptAlignmentScore: number;
  visibilityPct: number;
  avgPosition: number | null;
  evidence: string[];
}

export interface AcceptedCompetitor extends Omit<CompetitorCandidate, 'source'> {
  source: 'scan_inferred' | 'ai_validated';
}

export interface RejectedCompetitorCandidate extends CompetitorCandidate {
  source: CompetitorCandidateSource;
  reason: CompetitorRejectReason;
}

export interface CompetitorDiscoverySummary {
  version: number;
  strictScanFirst: boolean;
  businessProfile: BusinessProfile;
  candidates: CompetitorCandidate[];
  acceptedCompetitors: AcceptedCompetitor[];
  rejectedCandidates: RejectedCompetitorCandidate[];
}

export interface MentionSummary {
  overallScore: number;
  engineBreakdown: Record<AIEngine, EngineBreakdown>;
  engineStatus: Record<AIEngine, MentionEngineStatus>;
  results: MentionResult[];
  promptsUsed: MentionPrompt[];
  testedAt: number;
  competitorsMentioned: Array<{ name: string; count: number }>;
  inferredCompetitors?: InferredCompetitor[];
  competitorDiscovery?: CompetitorDiscoverySummary;
  visibilityPct?: number;
  shareOfVoice?: ShareOfVoiceData;
  sentimentSummary?: SentimentSummary;
  topicPerformance?: TopicPerformance[];
  competitorLeaderboard?: CompetitorLeaderboardEntry[];
}
