import type { ScanJob } from '@/types/scan';
import { getLane, normalizeScanProgress } from '@/lib/scan-progress';

export function estimateRemainingSeconds(
  scan: Pick<ScanJob, 'status' | 'createdAt' | 'progress'> & { enrichments?: ScanJob['enrichments'] },
  now = Date.now(),
) {
  if (scan.status === 'complete' || scan.status === 'failed') {
    return undefined;
  }

  const progress = normalizeScanProgress(scan.progress);
  const checks = progress.checks;
  const siteLane = getLane(progress, 'site_scan');
  const aiLane = getLane(progress, 'ai_mentions');
  const aiMetrics = scan.enrichments?.aiMentions?.metrics;
  if (checks.length === 0) {
    return 30;
  }

  const siteDone = siteLane?.status === 'done';
  const aiRunning = aiLane?.status === 'running' || aiLane?.status === 'pending';

  if (siteDone && aiRunning && aiMetrics) {
    const totalExecutions = Math.max((aiMetrics.plannedPrompts ?? 0) * Math.max(aiMetrics.enginesPlanned ?? 0, 1), 1);
    const executed = aiMetrics.executedPrompts ?? 0;
    const remainingExecutions = Math.max(totalExecutions - executed, 1);
    const elapsedSeconds = Math.max((now - scan.createdAt) / 1000, 1);
    const completedShare = Math.max(executed / totalExecutions, 0.05);
    const baseline = Math.round((elapsedSeconds / completedShare) * (1 - completedShare));
    const claudeStillRunning = aiMetrics.enginesPlanned && aiMetrics.enginesCompleted != null && aiMetrics.enginesCompleted < aiMetrics.enginesPlanned;
    const claudeFloor = claudeStillRunning ? Math.ceil(remainingExecutions * 3) : 0;
    return Math.max(10, Math.max(baseline, claudeFloor));
  }

  const completedChecks = checks.filter((check) => check.status === 'done').length;
  if (completedChecks === 0) {
    return 30;
  }

  const remainingChecks = Math.max(checks.length - completedChecks, 1);
  const elapsedSeconds = Math.max((now - scan.createdAt) / 1000, 1);
  const estimate = Math.round((elapsedSeconds / completedChecks) * remainingChecks);

  return Math.max(5, estimate);
}
