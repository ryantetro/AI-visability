import type { AIEngine, MentionSummary } from './ai-mentions';

export interface UserCompetitor {
  id: string;
  userId: string;
  domain: string;
  competitorUrl: string;
  competitorDomain: string;
  scanId: string | null;
  status: 'pending' | 'scanning' | 'complete' | 'failed';
  addedAt: string;
  lastScannedAt: string | null;
}

export interface CompetitorWithScanData extends UserCompetitor {
  scanData: {
    overallScore: number | null;
    aiVisibilityScore: number | null;
    mentionSummary: MentionSummary | null;
    completedAt: number | null;
  } | null;
}

export interface CompetitorComparisonData {
  userBrand: {
    domain: string;
    overallScore: number;
    aiVisibilityScore: number;
    mentionSummary: MentionSummary | null;
  };
  competitors: CompetitorWithScanData[];
}

export interface EngineHeatmapCell {
  brand: string;
  engine: AIEngine;
  mentionRate: number;
  mentioned: number;
  total: number;
}

export interface ShareOfVoiceSlice {
  name: string;
  value: number;
  color: string;
  isUser: boolean;
}
