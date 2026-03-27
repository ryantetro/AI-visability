import type {
  CheckProgress,
  ProgressLane,
  ProgressLaneKey,
  ScanProgress,
} from '@/types/scan';

const INITIAL_LANES: Array<{ key: ProgressLaneKey; label: string; checks: string[] }> = [
  {
    key: 'site_scan',
    label: 'Site Scan',
    checks: [
      'Crawling pages',
      'Scoring site',
      'Checking Web Health',
      'Preparing report assets',
    ],
  },
  {
    key: 'ai_mentions',
    label: 'AI Mentions',
    checks: [
      'Generating prompts',
      'Testing engines',
      'Analyzing responses',
      'Finalizing AI score',
    ],
  },
];

const LEGACY_LANE_CHECKS: Record<ProgressLaneKey, number[]> = {
  site_scan: [0, 1, 2, 3, 4, 5, 7, 8],
  ai_mentions: [6],
};

function deriveLaneStatus(checks: CheckProgress[]): ProgressLane['status'] {
  if (checks.some((check) => check.status === 'error')) return 'error';
  if (checks.length > 0 && checks.every((check) => check.status === 'done')) return 'done';
  if (checks.some((check) => check.status === 'running')) return 'running';
  return 'pending';
}

function deriveLaneProgressPct(checks: CheckProgress[]): number {
  if (checks.length === 0) return 0;
  const completed = checks.filter((check) => check.status === 'done').length;
  const running = checks.filter((check) => check.status === 'running').length;
  return Math.round(((completed + running * 0.5) / checks.length) * 100);
}

function cloneChecks(checks: CheckProgress[]): CheckProgress[] {
  return checks.map((check) => ({ ...check }));
}

export function createInitialProgressLanes(): ProgressLane[] {
  return INITIAL_LANES.map((lane) => {
    const checks = lane.checks.map((label) => ({ label, status: 'pending' as const }));
    return {
      key: lane.key,
      label: lane.label,
      status: 'pending',
      progressPct: 0,
      checks,
    };
  });
}

function deriveLegacyLanes(progress: ScanProgress): ProgressLane[] {
  return (Object.entries(LEGACY_LANE_CHECKS) as Array<[ProgressLaneKey, number[]]>).map(([key, indexes]) => {
    const checks = indexes
      .map((index) => progress.checks[index])
      .filter((check): check is CheckProgress => Boolean(check))
      .map((check) => ({ ...check }));

    return {
      key,
      label: key === 'site_scan' ? 'Site Scan' : 'AI Mentions',
      status: deriveLaneStatus(checks),
      progressPct: deriveLaneProgressPct(checks),
      currentStep: progress.currentStep,
      checks,
    };
  });
}

function normalizeLane(lane: ProgressLane): ProgressLane {
  const checks = cloneChecks(lane.checks ?? []);
  return {
    ...lane,
    checks,
    status: deriveLaneStatus(checks),
    progressPct: deriveLaneProgressPct(checks),
  };
}

export function normalizeScanProgress(progress: ScanProgress): ScanProgress {
  const checks = cloneChecks(progress.checks ?? []);
  const lanes = (progress.lanes?.length ? progress.lanes : deriveLegacyLanes({ ...progress, checks }))
    .map((lane) => normalizeLane(lane));

  return {
    ...progress,
    checks,
    lanes,
  };
}

export function updateLaneCheckStatus(
  progress: ScanProgress,
  laneKey: ProgressLaneKey,
  checkIndex: number,
  status: CheckProgress['status'],
  currentStep?: string,
) {
  progress.lanes = progress.lanes?.length ? progress.lanes : createInitialProgressLanes();
  const lane = progress.lanes.find((candidate) => candidate.key === laneKey);
  if (!lane || !lane.checks[checkIndex]) return;

  lane.checks[checkIndex].status = status;
  if (currentStep !== undefined) {
    lane.currentStep = currentStep;
  }

  const normalized = normalizeLane(lane);
  Object.assign(lane, normalized);
}

export function completeRemainingLaneChecks(
  progress: ScanProgress,
  laneKey: ProgressLaneKey,
  status: CheckProgress['status'],
) {
  progress.lanes = progress.lanes?.length ? progress.lanes : createInitialProgressLanes();
  const lane = progress.lanes.find((candidate) => candidate.key === laneKey);
  if (!lane) return;

  for (const check of lane.checks) {
    if (check.status === 'pending' || check.status === 'running') {
      check.status = status;
    }
  }

  const normalized = normalizeLane(lane);
  Object.assign(lane, normalized);
}

export function setLaneCurrentStep(
  progress: ScanProgress,
  laneKey: ProgressLaneKey,
  currentStep?: string,
) {
  progress.lanes = progress.lanes?.length ? progress.lanes : createInitialProgressLanes();
  const lane = progress.lanes.find((candidate) => candidate.key === laneKey);
  if (!lane) return;
  lane.currentStep = currentStep;
}

export function getLane(progress: ScanProgress, laneKey: ProgressLaneKey): ProgressLane | undefined {
  const normalized = normalizeScanProgress(progress);
  return normalized.lanes?.find((lane) => lane.key === laneKey);
}
