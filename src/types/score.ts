export type DimensionKey =
  | 'file-presence'
  | 'structured-data'
  | 'content-signals'
  | 'topical-authority'
  | 'entity-clarity'
  | 'ai-registration';

export type CheckVerdict = 'pass' | 'fail' | 'unknown';

export interface CheckResult {
  id: string;
  dimension: DimensionKey;
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
  dimension: DimensionKey;
  pointsAvailable: number;
  urgency: number; // 1-5
  effort: number; // 1-5
  roi: number; // computed
  instruction: string;
}

export interface ScoreResult {
  total: number;
  maxTotal: number;
  percentage: number;
  band: ScoreBand;
  bandInfo: ScoreBandInfo;
  dimensions: DimensionScore[];
  fixes: PrioritizedFix[];
}
