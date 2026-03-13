export type DimensionKey =
  | 'file-presence'
  | 'structured-data'
  | 'content-signals'
  | 'topical-authority'
  | 'entity-clarity'
  | 'ai-registration';

export type AuditCategory = 'ai' | 'web';
export type WebHealthStatus = 'pending' | 'running' | 'complete' | 'unavailable';
export type WebHealthPillarKey = 'performance' | 'quality' | 'security';
export type EffortBand = 'quick' | 'medium' | 'technical';

export type CheckVerdict = 'pass' | 'fail' | 'unknown';

export interface CheckResult {
  id: string;
  dimension: DimensionKey;
  category: AuditCategory;
  label: string;
  verdict: CheckVerdict;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface WebHealthCheckResult {
  id: string;
  pillar: WebHealthPillarKey;
  category: AuditCategory;
  label: string;
  verdict: CheckVerdict;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  checks: CheckResult[];
}

export type ScoreBand = 'ai-ready' | 'needs-work' | 'at-risk' | 'not-visible';

export interface ScoreBandInfo {
  band: ScoreBand;
  label: string;
  color: string;
  min: number;
  max: number;
}

export interface PrioritizedFix {
  checkId: string;
  label: string;
  detail: string;
  dimension: DimensionKey | WebHealthPillarKey;
  category: AuditCategory;
  pointsAvailable: number;
  estimatedLift: number;
  urgency: number; // 1-5
  effort: number; // 1-5
  effortBand: EffortBand;
  roi: number; // computed
  instruction: string;
  copyPrompt: string;
  actualValue?: string;
  expectedValue?: string;
}

export interface WebHealthMetric {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  status: 'ok' | 'warn' | 'unavailable';
  detail: string;
}

export interface WebHealthPillarScore {
  key: WebHealthPillarKey;
  label: string;
  score: number;
  maxScore: number;
  percentage: number | null;
  status: WebHealthStatus;
  checks: WebHealthCheckResult[];
}

export interface WebHealthSummary {
  status: WebHealthStatus;
  percentage: number | null;
  pillars: WebHealthPillarScore[];
  metrics: WebHealthMetric[];
  updatedAt?: number;
  source?: 'heuristic' | 'pagespeed';
  error?: string;
}

export interface ScoreSnapshot {
  aiVisibility: number;
  webHealth: number | null;
  overall: number | null;
  potentialLift: number | null;
}

export interface ScoreResult {
  total: number;
  maxTotal: number;
  percentage: number;
  band: ScoreBand;
  bandInfo: ScoreBandInfo;
  overallBand: ScoreBand;
  overallBandInfo: ScoreBandInfo;
  dimensions: DimensionScore[];
  fixes: PrioritizedFix[];
  scores: ScoreSnapshot;
  webHealth?: WebHealthSummary;
}
