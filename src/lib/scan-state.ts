import { createFailedMentionSummary } from '@/lib/ai-mentions';
import { normalizeMentionSummary } from '@/lib/ai-mentions/summary';
import { AI_ENGINES } from '@/lib/ai-engines';
import { normalizeScanProgress } from '@/lib/scan-progress';
import type { MentionSummary } from '@/types/ai-mentions';
import type { CrawlData } from '@/types/crawler';
import type { AiMentionsJobState, ScanJob, ScanProgress } from '@/types/scan';

function createDefaultAiMetrics(overrides: Partial<NonNullable<AiMentionsJobState['metrics']>> = {}) {
  return {
    plannedPrompts: 0,
    executedPrompts: 0,
    responsesCollected: 0,
    enginesPlanned: 0,
    enginesCompleted: 0,
    degraded: false,
    ...overrides,
  };
}

export function resolveMentionSummary(scan: {
  mentionSummary?: unknown;
  crawlData?: unknown;
  progress?: { checks?: Array<{ status?: string }> };
  enrichments?: { aiMentions?: { status?: string } };
}): MentionSummary | null {
  const normalized = normalizeMentionSummary(scan.mentionSummary as MentionSummary | null | undefined);
  if (normalized) return normalized;

  const mentionStepStatus = scan.progress?.checks?.[6]?.status;
  const aiStatus = scan.enrichments?.aiMentions?.status;
  if ((mentionStepStatus !== 'error' && aiStatus !== 'failed' && aiStatus !== 'unavailable') || !scan.crawlData) {
    return null;
  }

  return createFailedMentionSummary(
    scan.crawlData as CrawlData,
    AI_ENGINES.slice(),
    'AI mention testing did not complete for this scan.',
  );
}

export function resolveAiMentionsState(scan: {
  enrichments?: ScanJob['enrichments'];
  mentionSummary?: unknown;
  progress?: ScanProgress;
  status?: ScanJob['status'];
}): AiMentionsJobState {
  const existing = scan.enrichments?.aiMentions;
  if (existing) {
    return {
      ...existing,
      phase: existing.phase ?? null,
      metrics: createDefaultAiMetrics(existing.metrics),
    };
  }

  const summary = normalizeMentionSummary(scan.mentionSummary as MentionSummary | null | undefined);
  if (summary) {
    const configuredEngines = AI_ENGINES.filter((engine) => summary.engineStatus?.[engine]?.configured);
    const terminalEngines = AI_ENGINES.filter((engine) => {
      const status = summary.engineStatus?.[engine]?.status;
      return status === 'complete' || status === 'error' || status === 'not_configured';
    });
    const degraded = summary.results.some((result) => result.analysisSource === 'heuristic');
    const unavailable = summary.results.length === 0 && Object.values(summary.engineStatus ?? {}).some((status) => status.status === 'error');

    return {
      status: unavailable ? 'failed' : 'complete',
      phase: null,
      metrics: createDefaultAiMetrics({
        plannedPrompts: summary.promptsUsed.length,
        executedPrompts: summary.results.length,
        responsesCollected: summary.results.length,
        enginesPlanned: configuredEngines.length,
        enginesCompleted: terminalEngines.length,
        degraded,
      }),
    };
  }

  const mentionStepStatus = scan.progress?.checks?.[6]?.status;
  if (mentionStepStatus === 'running') {
    return {
      status: 'running',
      phase: 'queued',
      metrics: createDefaultAiMetrics(),
    };
  }
  if (mentionStepStatus === 'error') {
    return {
      status: 'failed',
      phase: null,
      metrics: createDefaultAiMetrics(),
    };
  }
  if (scan.status === 'complete') {
    return {
      status: 'unavailable',
      phase: null,
      metrics: createDefaultAiMetrics(),
    };
  }

  return {
    status: 'pending',
    phase: 'queued',
    metrics: createDefaultAiMetrics(),
  };
}

export function resolveScanState(scan: ScanJob) {
  const progress = normalizeScanProgress(scan.progress);
  const mentionSummary = resolveMentionSummary(scan);
  const aiMentions = resolveAiMentionsState({
    enrichments: scan.enrichments,
    mentionSummary,
    progress,
    status: scan.status,
  });

  return {
    progress,
    mentionSummary,
    enrichments: {
      webHealth: scan.enrichments?.webHealth ?? { status: 'pending' as const },
      aiMentions,
    },
  };
}
