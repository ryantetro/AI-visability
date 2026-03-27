export type ScanStatus = 'pending' | 'crawling' | 'scoring' | 'complete' | 'failed';
export type AsyncJobStatus = 'pending' | 'running' | 'complete' | 'failed' | 'unavailable';
export type AiMentionsPhase = 'queued' | 'prompt_generation' | 'engine_testing' | 'response_analysis' | 'finalizing';
export type ProgressLaneKey = 'site_scan' | 'ai_mentions';

export interface EnrichmentState {
  status: 'pending' | 'running' | 'complete' | 'unavailable';
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface AiMentionsMetrics {
  plannedPrompts: number;
  executedPrompts: number;
  responsesCollected: number;
  enginesPlanned: number;
  enginesCompleted: number;
  degraded: boolean;
}

export interface AiMentionsJobState {
  status: AsyncJobStatus;
  phase: AiMentionsPhase | null;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  metrics?: Partial<AiMentionsMetrics>;
}

export interface CheckProgress {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

export interface ProgressLane {
  key: ProgressLaneKey;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  progressPct?: number;
  currentStep?: string;
  checks: CheckProgress[];
}

export interface ScanProgress {
  status: ScanStatus;
  checks: CheckProgress[];
  lanes?: ProgressLane[];
  currentStep?: string;
  error?: string;
}

export interface ScanJob {
  id: string;
  url: string;
  normalizedUrl: string;
  status: ScanStatus;
  progress: ScanProgress;
  enrichments?: {
    webHealth: EnrichmentState;
    aiMentions?: AiMentionsJobState;
  };
  email?: string;
  paid?: boolean;
  createdAt: number;
  completedAt?: number;
  crawlData?: unknown; // CrawlData stored loosely to avoid circular deps at this level
  scoreResult?: unknown; // ScoreResult
  generatedFiles?: unknown; // GeneratedFiles
  mentionSummary?: unknown; // MentionSummary
}
