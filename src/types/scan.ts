export type ScanStatus = 'pending' | 'crawling' | 'scoring' | 'complete' | 'failed';

export interface CheckProgress {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

export interface ScanProgress {
  status: ScanStatus;
  checks: CheckProgress[];
  currentStep?: string;
  error?: string;
}

export interface ScanJob {
  id: string;
  url: string;
  normalizedUrl: string;
  status: ScanStatus;
  progress: ScanProgress;
  email?: string;
  paid?: boolean;
  createdAt: number;
  completedAt?: number;
  crawlData?: unknown; // CrawlData stored loosely to avoid circular deps at this level
  scoreResult?: unknown; // ScoreResult
  generatedFiles?: unknown; // GeneratedFiles
}
