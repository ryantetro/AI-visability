import type { LucideIcon } from 'lucide-react';
import type { PrioritizedFix } from '@/types/score';

export interface GeneratedFile {
  filename: string;
  content: string;
  description: string;
  installInstructions: string;
}

export interface FilesData {
  files: GeneratedFile[];
  generatedAt: number;
  detectedPlatform: 'wordpress' | 'squarespace' | 'webflow' | 'custom';
  url: string;
  copyToLlm: {
    fullPrompt: string;
    remainingFixesPrompt: string;
    fixPrompts: { checkId: string; label: string; prompt: string }[];
  } | null;
}

export interface DashboardReportData {
  id: string;
  url: string;
  hasPaid: boolean;
  score: {
    fixes: PrioritizedFix[];
    scores: {
      aiVisibility: number;
      webHealth: number | null;
      overall: number | null;
      potentialLift: number | null;
    };
    overallBandInfo?: {
      label: string;
      color: string;
    };
    dimensions?: Array<{
      key: string;
      label: string;
      score: number;
      maxScore: number;
      percentage: number;
      checks: Array<{
        id: string;
        label: string;
        verdict: 'pass' | 'fail' | 'unknown';
        points: number;
        maxPoints: number;
      }>;
    }>;
    webHealth?: {
      updatedAt?: number;
      pillars?: Array<{
        key: 'performance' | 'quality' | 'security';
        percentage: number | null;
      }>;
    } | null;
  };
  fixes?: PrioritizedFix[];
  scores?: {
    aiVisibility: number;
    webHealth: number | null;
    overall: number | null;
    potentialLift: number | null;
  };
  copyToLlm?: {
    fullPrompt: string;
    remainingFixesPrompt: string;
    fixPrompts: { checkId: string; label: string; prompt: string }[];
  };
  mentionSummary?: {
    overallScore: number;
    results?: Array<{
      engine: string;
      mentioned: boolean;
      citationPresent: boolean;
      citationUrls?: Array<{
        url: string;
        domain: string;
        anchorText: string | null;
        isOwnDomain: boolean;
        isCompetitor: boolean;
      }>;
      prompt: { text: string; category: string };
    }>;
  } | null;
}

export interface ApiErrorPayload {
  error?: string;
}

export interface RecentScanData {
  id: string;
  url: string;
  status: string;
  score?: number;
  scores?: {
    aiVisibility: number;
    webHealth: number | null;
    overall: number | null;
    potentialLift: number | null;
  };
  previewFixes?: Array<{ checkId: string; label: string }>;
  hasEmail: boolean;
  hasPaid: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface SiteSummary {
  domain: string;
  url: string;
  latestScan: RecentScanData | null;
  latestPaidScan: RecentScanData | null;
  lastTouchedAt: number | null;
  source: 'paid' | 'manual';
}

export interface FileMeta {
  subtitle: string;
  purpose: string;
  installTarget: string;
  verify: string;
  icon: LucideIcon;
}

export interface WorkstreamMeta {
  key: 'ai-visibility' | 'crawl-discovery' | 'structured-data' | 'performance' | 'trust';
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface PromptMonitoringData {
  prompts: Array<{
    id: string;
    domain: string;
    promptText: string;
    category: string;
    active: boolean;
    createdAt: string;
  }>;
  results: Array<{
    promptId: string;
    engine: string;
    mentioned: boolean;
    position: number | null;
    testedAt: string;
  }>;
}

export type PromptCategory = 'all' | 'brand' | 'competitor' | 'industry' | 'custom';

export interface TrendPoint {
  week: string;
  engine: string;
  avgPosition: number | null;
  mentionRate: number;
  totalChecks: number;
}

export interface CompetitorData {
  competitor: string;
  appearances: number;
  avgPosition: number | null;
  engines: string[];
  coMentionedCount: number;
}

export interface CrawlerSummary {
  botName: string;
  botCategory: string;
  visitCount: number;
  uniquePaths: number;
  lastSeen: string;
}

export interface ContentGap {
  promptText: string;
  category: string;
  engines: string[];
  totalChecks: number;
  mentionRate: number;
}
