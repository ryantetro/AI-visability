import type { AIEngine } from '@/types/ai-mentions';

export type OptimizeTabKey = 'overview' | 'content' | 'sources' | 'actions' | 'brand';

export type MaturityStage = 1 | 2 | 3 | 4;

export interface MaturityCriterion {
  key: string;
  label: string;
  met: boolean;
  stage: 2 | 3 | 4;
  tab: OptimizeTabKey;
}

export interface MaturityResult {
  stage: MaturityStage;
  label: 'Unaware' | 'Auditing' | 'Optimizing' | 'Operationalized';
  counts: {
    prompts: number;
    platforms: number;
    content: number;
    completedActions: number;
  };
  criteria: MaturityCriterion[];
}

export type ContentStudioType =
  | 'comparison'
  | 'howto'
  | 'definition'
  | 'listicle'
  | 'faq'
  | 'case_study';

export interface ContentOpportunity {
  promptId: string;
  promptText: string;
  category: string;
  contentType: ContentStudioType;
  missingEngines: AIEngine[];
  weakEngines: AIEngine[];
  competitorNames: string[];
  priorityScore: number;
  reason: string;
}

export type SourceCategory =
  | 'own_site'
  | 'competitor'
  | 'review_platform'
  | 'community'
  | 'directory'
  | 'publisher'
  | 'other';

export interface SourceDomainSummary {
  domain: string;
  category: SourceCategory;
  citations: number;
  prompts: number;
  sharePct: number;
  engines: AIEngine[];
  brandPresence: boolean;
}

export interface SourceGap {
  domain: string;
  category: Exclude<SourceCategory, 'own_site' | 'competitor'>;
  competitorCitations: number;
  competitors: string[];
  recommendation: string;
  actionTitle: string;
}

export interface SourceEcosystemAnalysis {
  computedAt: string;
  sourcesCount: number;
  breakdown: {
    ownSitePct: number;
    competitorPct: number;
    thirdPartyPct: number;
    counts: Record<SourceCategory, number>;
  };
  topSources: SourceDomainSummary[];
  gaps: SourceGap[];
  perEngine: Partial<Record<AIEngine, SourceDomainSummary[]>>;
}

export type OptimizationActionCategory =
  | 'review_platform'
  | 'community'
  | 'pr_media'
  | 'directory'
  | 'technical'
  | 'content_distribution';

export type OptimizationActionSource =
  | 'gap_analysis'
  | 'scan_fix'
  | 'prompt_insight'
  | 'best_practice';

export type OptimizationActionPriority = 'high' | 'medium' | 'low';
export type OptimizationActionStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';
export type OptimizationActionImpact = 'high' | 'medium' | 'low';

export interface OptimizationActionDraft {
  category: OptimizationActionCategory;
  title: string;
  description: string;
  source: OptimizationActionSource;
  priority: OptimizationActionPriority;
  estimatedImpact: OptimizationActionImpact;
}

export interface OptimizationActionRecord extends OptimizationActionDraft {
  id: string | null;
  status: OptimizationActionStatus;
  completedAt: string | null;
  createdAt: string | null;
  preview?: boolean;
}

export interface BrandPositioningInput {
  tagline: string | null;
  description: string | null;
  differentiators: string[];
  targetAudience: string | null;
  category: string | null;
  negativeAssociations: string[];
}
