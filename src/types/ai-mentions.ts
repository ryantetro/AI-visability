export type AIEngine = 'chatgpt' | 'perplexity' | 'gemini' | 'claude';

export interface MentionPrompt {
  id: string;
  text: string;
  category: 'direct' | 'category' | 'comparison' | 'recommendation';
  industry: string;
  location?: string;
}

export interface CitationUrl {
  url: string;
  domain: string;
  anchorText: string | null;
  isOwnDomain: boolean;
  isCompetitor: boolean;
}

export interface MentionResult {
  engine: AIEngine;
  prompt: MentionPrompt;
  mentioned: boolean;
  position: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  citationPresent: boolean;
  citationUrls: CitationUrl[];
  descriptionAccurate: boolean;
  competitors: string[];
  rawSnippet: string;
  testedAt: number;
}

export interface EngineBreakdown {
  mentioned: number;
  total: number;
  avgPosition: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | 'not-found';
}

export interface MentionSummary {
  overallScore: number;
  engineBreakdown: Record<AIEngine, EngineBreakdown>;
  results: MentionResult[];
  promptsUsed: MentionPrompt[];
  testedAt: number;
  competitorsMentioned: Array<{ name: string; count: number }>;
}
