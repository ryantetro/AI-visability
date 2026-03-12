import { ScanJob } from '@/types/scan';

export function estimateRemainingSeconds(scan: Pick<ScanJob, 'status' | 'createdAt' | 'progress'>, now = Date.now()) {
  if (scan.status === 'complete' || scan.status === 'failed') {
    return undefined;
  }

  const checks = scan.progress.checks;
  if (checks.length === 0) {
    return 30;
  }

  const completedChecks = checks.filter((check) => check.status === 'done').length;
  if (completedChecks === 0) {
    return 30;
  }

  const remainingChecks = Math.max(checks.length - completedChecks, 1);
  const elapsedSeconds = Math.max((now - scan.createdAt) / 1000, 1);
  const estimate = Math.round((elapsedSeconds / completedChecks) * remainingChecks);

  return Math.min(45, Math.max(5, estimate));
}
