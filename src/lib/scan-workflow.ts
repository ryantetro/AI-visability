import { randomUUID } from 'node:crypto';
import { crawlSite } from '@/lib/crawler';
import { scoreCrawlData } from '@/lib/scorer';
import { getDatabase, getMentionTester } from '@/lib/services/registry';
import { normalizeUrl, isValidUrl } from '@/lib/url-utils';
import { checkScanRateLimit, recordScanRequest } from '@/lib/scan-rate-limit';
import { runWebHealthEnrichment, createUnavailableWebHealth } from '@/lib/web-health';
import {
  buildPromptReuseFingerprint,
  createFailedMentionSummary,
  runMentionTestJob,
} from '@/lib/ai-mentions';
import { isValidPromptText } from '@/lib/ai-mentions/prompt-generator';
import { AI_ENGINES } from '@/lib/ai-engines';
import { CrawlData } from '@/types/crawler';
import { DatabaseService } from '@/types/services';
import type { MentionPrompt, MentionSummary } from '@/types/ai-mentions';
import {
  type AiMentionsJobState,
  type AiMentionsMetrics,
  ScanJob,
  ScanProgress,
} from '@/types/scan';
import { getOrCreateProfile, canUserScan, incrementScanCount, getUserUsage } from '@/lib/user-profile';
import { getUserAccess } from '@/lib/access';
import { getScannableEngines, getSelectedPlatforms } from '@/lib/platform-gating';
import type { MentionTesterService } from '@/lib/ai-mentions/engine-tester';
import { generateAllFiles } from '@/lib/generator';
import {
  completeRemainingLaneChecks,
  createInitialProgressLanes,
  normalizeScanProgress,
  setLaneCurrentStep,
  updateLaneCheckStatus,
} from '@/lib/scan-progress';
import { normalizeMentionSummary } from '@/lib/ai-mentions/summary';

export interface StartScanInput {
  url: string;
  force?: boolean;
  ip: string;
  userEmail: string;
  userId: string;
}

export interface StartScanResult {
  body: Record<string, unknown>;
  status: number;
}

interface StartScanOptions {
  db?: DatabaseService;
  now?: number;
  schedule?: (task: () => Promise<void>) => void | Promise<void>;
}

const SITE_SCAN_LANE_INDEX = {
  crawl: 0,
  scoring: 1,
  webHealth: 2,
  reportAssets: 3,
} as const;

const AI_MENTIONS_LANE_INDEX = {
  prompts: 0,
  engines: 1,
  analysis: 2,
  finalizing: 3,
} as const;

const AI_MENTION_TIMEOUT_MS = 240_000;
const FILE_GENERATION_TIMEOUT_MS = 30_000;
const PROMPT_REUSE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function createEmptyAiMentionsMetrics(
  overrides: Partial<AiMentionsMetrics> = {},
): AiMentionsMetrics {
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

function createInitialAiMentionsState(): AiMentionsJobState {
  return {
    status: 'pending',
    phase: 'queued',
    metrics: createEmptyAiMentionsMetrics(),
  };
}

function getWebHealthEnrichment(scan: ScanJob) {
  return scan.enrichments?.webHealth ?? { status: 'pending' as const };
}

function updateLegacyCheck(progress: ScanProgress, checkIndex: number, status: 'pending' | 'running' | 'done' | 'error') {
  if (progress.checks[checkIndex]) {
    progress.checks[checkIndex].status = status;
  }
}

function markAiLanePhase(
  progress: ScanProgress,
  phase: AiMentionsJobState['phase'],
  currentStep?: string | null,
) {
  const promptStatus = phase === 'prompt_generation' ? 'running' : phase && phase !== 'queued' ? 'done' : 'pending';
  const engineStatus = phase === 'engine_testing' ? 'running' : phase === 'response_analysis' || phase === 'finalizing' ? 'done' : 'pending';
  const analysisStatus = phase === 'response_analysis' ? 'running' : phase === 'finalizing' ? 'done' : 'pending';
  const finalizingStatus = phase === 'finalizing' ? 'running' : 'pending';

  updateLaneCheckStatus(progress, 'ai_mentions', AI_MENTIONS_LANE_INDEX.prompts, promptStatus, currentStep ?? undefined);
  updateLaneCheckStatus(progress, 'ai_mentions', AI_MENTIONS_LANE_INDEX.engines, engineStatus, currentStep ?? undefined);
  updateLaneCheckStatus(progress, 'ai_mentions', AI_MENTIONS_LANE_INDEX.analysis, analysisStatus, currentStep ?? undefined);
  updateLaneCheckStatus(progress, 'ai_mentions', AI_MENTIONS_LANE_INDEX.finalizing, finalizingStatus, currentStep ?? undefined);
  setLaneCurrentStep(progress, 'ai_mentions', currentStep ?? undefined);
}

function markAiLaneComplete(progress: ScanProgress, currentStep?: string) {
  updateLaneCheckStatus(progress, 'ai_mentions', AI_MENTIONS_LANE_INDEX.prompts, 'done', currentStep);
  updateLaneCheckStatus(progress, 'ai_mentions', AI_MENTIONS_LANE_INDEX.engines, 'done', currentStep);
  updateLaneCheckStatus(progress, 'ai_mentions', AI_MENTIONS_LANE_INDEX.analysis, 'done', currentStep);
  updateLaneCheckStatus(progress, 'ai_mentions', AI_MENTIONS_LANE_INDEX.finalizing, 'done', currentStep);
  setLaneCurrentStep(progress, 'ai_mentions', currentStep);
}

function markAiLaneFailed(progress: ScanProgress, currentStep?: string) {
  completeRemainingLaneChecks(progress, 'ai_mentions', 'error');
  setLaneCurrentStep(progress, 'ai_mentions', currentStep);
}

function mergeAiMetrics(
  current: AiMentionsJobState['metrics'],
  next: Partial<AiMentionsMetrics>,
): AiMentionsMetrics {
  return {
    ...createEmptyAiMentionsMetrics(),
    ...(current ?? {}),
    ...next,
  };
}

function resolveAiMentionsOverallStep(scan: ScanJob) {
  const aiStep = scan.progress.lanes?.find((lane) => lane.key === 'ai_mentions')?.currentStep;
  const siteStep = scan.progress.lanes?.find((lane) => lane.key === 'site_scan')?.currentStep;
  scan.progress.currentStep = aiStep || siteStep || scan.progress.currentStep;
}

function isTerminalAiStatus(status: AiMentionsJobState['status'] | undefined) {
  return status === 'complete' || status === 'failed' || status === 'unavailable';
}

function resolveReusablePrompts(scan: ScanJob, latestScan: ScanJob | null, crawlData: CrawlData): MentionPrompt[] | null {
  if (!latestScan || latestScan.id === scan.id) return null;
  const latestCompletedAt = latestScan.completedAt ?? latestScan.createdAt;
  if (Date.now() - latestCompletedAt > PROMPT_REUSE_MAX_AGE_MS) return null;
  if (!latestScan.crawlData) return null;

  const summary = normalizeMentionSummary(latestScan.mentionSummary as MentionSummary | null | undefined);
  if (!summary?.promptsUsed?.length) return null;

  if (buildPromptReuseFingerprint(latestScan.crawlData as CrawlData) !== buildPromptReuseFingerprint(crawlData)) {
    return null;
  }

  const reusablePrompts = summary.promptsUsed.filter((prompt) => isValidPromptText(prompt.text));
  if (reusablePrompts.length < 10) {
    return null;
  }

  return reusablePrompts;
}

export function initialProgress(): ScanProgress {
  return normalizeScanProgress({
    status: 'pending',
    checks: [
      { label: 'Fetching robots.txt & sitemap', status: 'pending' },
      { label: 'Checking llms.txt', status: 'pending' },
      { label: 'Crawling pages', status: 'pending' },
      { label: 'Measuring performance', status: 'pending' },
      { label: 'Analyzing structured data', status: 'pending' },
      { label: 'Scoring AI visibility', status: 'pending' },
      { label: 'Testing AI mentions', status: 'pending' },
      { label: 'Checking Web Health', status: 'pending' },
      { label: 'Generating report', status: 'pending' },
    ],
    lanes: createInitialProgressLanes(),
  });
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function startScan(
  { url, force = false, ip, userEmail, userId }: StartScanInput,
  { db = getDatabase(), now = Date.now(), schedule }: StartScanOptions = {}
): Promise<StartScanResult> {
  if (!url || !isValidUrl(url)) {
    return {
      status: 400,
      body: { error: 'Invalid URL' },
    };
  }

  // Per-user scan limit check
  try {
    const profile = await getOrCreateProfile(userId, userEmail);
    if (!canUserScan()) {
      const usage = getUserUsage(profile);
      return {
        status: 403,
        body: {
          error: 'Free scan limit reached. Upgrade to continue.',
          upgradeRequired: true,
          used: usage.used,
          limit: usage.limit,
        },
      };
    }
  } catch {
    // If profile check fails, allow scan to proceed (fail open)
  }

  const enforceRateLimit = process.env.NODE_ENV !== 'development';

  if (enforceRateLimit) {
    const rateLimit = checkScanRateLimit(ip, now);
    if (!rateLimit.allowed) {
      return {
        status: 429,
        body: {
          error: 'Free audit limit reached for this IP. Try again later.',
          limit: rateLimit.limit,
          retryAfterSec: rateLimit.retryAfterSec,
        },
      };
    }
  }

  try {
    const normalized = normalizeUrl(url);

    if (!force) {
      const cached = await db.findScanByUrl(normalized);
      if (cached && cached.email?.toLowerCase() === userEmail.toLowerCase()) {
        if (enforceRateLimit) {
          recordScanRequest(ip, now);
        }
        return {
          status: 200,
          body: { id: cached.id, cached: true },
        };
      }
    }

    const id = randomUUID();
    const scan: ScanJob = {
      id,
      url,
      normalizedUrl: normalized,
      status: 'pending',
      progress: initialProgress(),
      enrichments: {
        webHealth: {
          status: 'pending',
        },
        aiMentions: createInitialAiMentionsState(),
      },
      email: userEmail,
      createdAt: now,
    };

    await db.saveScan(scan);
    if (enforceRateLimit) {
      recordScanRequest(ip, now);
    }

    // Increment per-user scan count
    try {
      await incrementScanCount(userId);
    } catch {
      // Non-blocking: scan still proceeds if count update fails
    }

    if (schedule) {
      await schedule(async () => {
        await runScan(id, db);
      });
    }

    return {
      status: 200,
      body: { id, cached: false },
    };
  } catch {
    return {
      status: 500,
      body: { error: 'Failed to start scan' },
    };
  }
}

export async function runScan(scanId: string, db = getDatabase()) {
  const initialScan = await db.getScan(scanId);
  if (!initialScan) return;

  let persistChain = Promise.resolve<ScanJob | null>(initialScan);
  const updateStoredScan = async (
    mutate: (scan: ScanJob) => void | Promise<void>,
  ): Promise<ScanJob | null> => {
    persistChain = persistChain.then(async () => {
      const latest = await db.getScan(scanId);
      if (!latest) return null;
      await mutate(latest);
      latest.progress = normalizeScanProgress(latest.progress);
      resolveAiMentionsOverallStep(latest);
      await db.saveScan(latest);
      return latest;
    });

    return persistChain;
  };

  try {
    await updateStoredScan((scan) => {
      scan.status = 'crawling';
      scan.progress.status = 'crawling';
      updateLegacyCheck(scan.progress, 0, 'running');
      updateLaneCheckStatus(scan.progress, 'site_scan', SITE_SCAN_LANE_INDEX.crawl, 'running', 'Crawling site');
      setLaneCurrentStep(scan.progress, 'site_scan', 'Crawling site');
    });

    const crawlData = await crawlSite(initialScan.url, async (step: string) => {
      await updateStoredScan((scan) => {
        scan.progress.currentStep = step;
        setLaneCurrentStep(scan.progress, 'site_scan', step);

        if (step.includes('sitemap')) {
          updateLegacyCheck(scan.progress, 0, 'done');
          updateLegacyCheck(scan.progress, 1, 'running');
        } else if (step.includes('llms')) {
          updateLegacyCheck(scan.progress, 1, 'done');
          updateLegacyCheck(scan.progress, 2, 'running');
        } else if (
          step.includes('homepage') ||
          step.includes('Crawling /') ||
          step.includes('Launching browser')
        ) {
          updateLegacyCheck(scan.progress, 2, 'running');
        }
      });
    });

    await updateStoredScan((scan) => {
      scan.crawlData = crawlData;
      for (let index = 0; index < 3; index += 1) {
        updateLegacyCheck(scan.progress, index, 'done');
      }
      updateLaneCheckStatus(scan.progress, 'site_scan', SITE_SCAN_LANE_INDEX.crawl, 'done', 'Site crawl complete');
      updateLaneCheckStatus(scan.progress, 'site_scan', SITE_SCAN_LANE_INDEX.scoring, 'running', 'Scoring site');
      scan.status = 'scoring';
      scan.progress.status = 'scoring';
    });

    const mentionTester = getMentionTester();
    const allAvailableEngines = mentionTester.availableEngines();
    let filteredEngines: typeof AI_ENGINES = allAvailableEngines;

    try {
      if (initialScan.email) {
        const supabase = await import('@/lib/supabase').then((module) => module.getSupabaseClient());
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', initialScan.email.toLowerCase())
          .single();

        if (profile?.id) {
          const domain = new URL(initialScan.url).hostname.replace(/^www\./, '');
          const access = await getUserAccess(profile.id, initialScan.email);
          const selectedPlatforms = await getSelectedPlatforms(profile.id, domain);
          filteredEngines = getScannableEngines(selectedPlatforms, access.tier, allAvailableEngines);
        }
      }
    } catch {
      // Platform gating lookup failed — fall through to all available engines
    }

    const filteredTester: MentionTesterService = {
      query: (engine, prompt) => mentionTester.query(engine, prompt),
      availableEngines: () => filteredEngines,
      supportsProviderPacing: mentionTester.supportsProviderPacing,
    };
    const missingApiKeyEngines = AI_ENGINES.filter((engine) => !allAvailableEngines.includes(engine));
    const platformFilteredEngines = allAvailableEngines.filter((engine) => !filteredEngines.includes(engine));
    console.log(
      `[scan-workflow] Starting AI mention testing. Engines: ${filteredEngines.join(', ') || 'none'}. `
      + `Missing API key: ${missingApiKeyEngines.join(', ') || 'none'}. `
      + `Filtered by platform settings: ${platformFilteredEngines.join(', ') || 'none'}.`
    );

    const currentScan = await db.getScan(scanId);
    const domain = new URL(initialScan.url).hostname.replace(/^www\./, '');
    const latestCompletedScan = await db.findLatestScanByDomain(domain, initialScan.email);
    const cachedPrompts = currentScan
      ? resolveReusablePrompts(currentScan, latestCompletedScan, crawlData)
      : null;

    const siteScanPromise = (async () => {
      try {
        const webHealthStartedAt = Date.now();
        await updateStoredScan((scan) => {
          scan.enrichments = {
            ...scan.enrichments,
            webHealth: {
              status: 'running',
              startedAt: webHealthStartedAt,
            },
          };
          updateLegacyCheck(scan.progress, 3, 'running');
          updateLegacyCheck(scan.progress, 4, 'running');
          updateLegacyCheck(scan.progress, 5, 'running');
          updateLegacyCheck(scan.progress, 7, 'running');
          updateLaneCheckStatus(scan.progress, 'site_scan', SITE_SCAN_LANE_INDEX.scoring, 'running', 'Scoring site');
          updateLaneCheckStatus(scan.progress, 'site_scan', SITE_SCAN_LANE_INDEX.webHealth, 'running', 'Checking Web Health');
          scan.progress.currentStep = 'Scoring site';
        });

        const webHealth = await withTimeout(
          runWebHealthEnrichment(crawlData),
          15000,
          'Web Health enrichment timed out before completion.',
        ).catch((error) => createUnavailableWebHealth(String(error)));

        const scoreResult = scoreCrawlData(crawlData, webHealth);
        await updateStoredScan((scan) => {
          scan.scoreResult = scoreResult;
          updateLegacyCheck(scan.progress, 3, 'done');
          updateLegacyCheck(scan.progress, 4, 'done');
          updateLegacyCheck(scan.progress, 5, 'done');
          updateLegacyCheck(scan.progress, 7, webHealth.status === 'complete' ? 'done' : 'error');
          updateLegacyCheck(scan.progress, 8, 'running');
          updateLaneCheckStatus(scan.progress, 'site_scan', SITE_SCAN_LANE_INDEX.scoring, 'done', 'Site score ready');
          updateLaneCheckStatus(
            scan.progress,
            'site_scan',
            SITE_SCAN_LANE_INDEX.webHealth,
            webHealth.status === 'complete' ? 'done' : 'error',
            webHealth.status === 'complete' ? 'Web Health ready' : 'Web Health unavailable',
          );
          updateLaneCheckStatus(scan.progress, 'site_scan', SITE_SCAN_LANE_INDEX.reportAssets, 'running', 'Preparing report assets');
          scan.enrichments = {
            ...scan.enrichments,
            webHealth: {
              status: webHealth.status === 'complete' ? 'complete' : 'unavailable',
              startedAt: webHealthStartedAt,
              completedAt: Date.now(),
              error: webHealth.error,
            },
          };
        });

        try {
          const generatedFiles = await withTimeout(
            generateAllFiles(crawlData),
            FILE_GENERATION_TIMEOUT_MS,
            'Generated file preparation timed out.',
          );
          await updateStoredScan((scan) => {
            scan.generatedFiles = generatedFiles;
            updateLegacyCheck(scan.progress, 8, 'done');
            updateLaneCheckStatus(scan.progress, 'site_scan', SITE_SCAN_LANE_INDEX.reportAssets, 'done', 'Report assets ready');
          });
        } catch (error) {
          console.warn('[scan-workflow] Report asset pre-generation failed:', error);
          await updateStoredScan((scan) => {
            updateLegacyCheck(scan.progress, 8, 'done');
            updateLaneCheckStatus(scan.progress, 'site_scan', SITE_SCAN_LANE_INDEX.reportAssets, 'done', 'Report ready');
          });
        }

        return { ok: true as const };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await updateStoredScan((scan) => {
          scan.progress.error = message;
          completeRemainingLaneChecks(scan.progress, 'site_scan', 'error');
          setLaneCurrentStep(scan.progress, 'site_scan', 'Site scan failed');
          for (const checkIndex of [3, 4, 5, 7, 8]) {
            if (scan.progress.checks[checkIndex]?.status === 'running' || scan.progress.checks[checkIndex]?.status === 'pending') {
              updateLegacyCheck(scan.progress, checkIndex, 'error');
            }
          }
          scan.enrichments = {
            ...scan.enrichments,
            webHealth: {
              ...(scan.enrichments?.webHealth ?? { status: 'unavailable' }),
              status: 'unavailable',
              completedAt: Date.now(),
              error: message,
            },
          };
        });

        return { ok: false as const, error: message };
      }
    })();

    const aiMentionsStartedAt = Date.now();
    const aiMentionPromise = (async () => {
      try {
        await updateStoredScan((scan) => {
          scan.enrichments = {
            webHealth: getWebHealthEnrichment(scan),
            aiMentions: {
              status: 'running',
              phase: 'queued',
              startedAt: aiMentionsStartedAt,
              metrics: createEmptyAiMentionsMetrics({
                enginesPlanned: filteredEngines.length,
              }),
            },
          };
          updateLegacyCheck(scan.progress, 6, 'running');
          updateLaneCheckStatus(scan.progress, 'ai_mentions', AI_MENTIONS_LANE_INDEX.prompts, 'running', 'Preparing AI mention prompts');
          setLaneCurrentStep(scan.progress, 'ai_mentions', 'Preparing AI mention prompts');
        });

        if (filteredEngines.length === 0) {
          const message = 'No AI engines are configured for this scan.';
          await updateStoredScan((scan) => {
            scan.mentionSummary = createFailedMentionSummary(crawlData, [], message);
            scan.enrichments = {
              webHealth: getWebHealthEnrichment(scan),
              aiMentions: {
                status: 'unavailable',
                phase: null,
                startedAt: aiMentionsStartedAt,
                completedAt: Date.now(),
                error: message,
                metrics: createEmptyAiMentionsMetrics(),
              },
            };
            updateLegacyCheck(scan.progress, 6, 'error');
            markAiLaneFailed(scan.progress, 'AI mentions unavailable');
          });
          return { ok: false as const, unavailable: true as const };
        }

        const mentionExecution = await withTimeout(
          runMentionTestJob(crawlData, filteredTester, {
            cachedPrompts,
            onProgress: async (update) => {
              await updateStoredScan((scan) => {
                const nextMetrics = mergeAiMetrics(scan.enrichments?.aiMentions?.metrics, update.metrics);
                scan.enrichments = {
                  webHealth: getWebHealthEnrichment(scan),
                  aiMentions: {
                    status: 'running',
                    phase: update.phase,
                    startedAt: aiMentionsStartedAt,
                    metrics: nextMetrics,
                  },
                };
                updateLegacyCheck(scan.progress, 6, 'running');
                markAiLanePhase(scan.progress, update.phase, update.currentStep);
                scan.progress.currentStep = update.currentStep ?? scan.progress.currentStep;
              });
            },
          }),
          AI_MENTION_TIMEOUT_MS,
          'AI mention testing timed out.',
        );

        console.log('[scan-workflow] AI mention testing complete, score:', mentionExecution.summary.overallScore);
        await updateStoredScan((scan) => {
          scan.mentionSummary = mentionExecution.summary;
          scan.enrichments = {
            webHealth: getWebHealthEnrichment(scan),
            aiMentions: {
              status: 'complete',
              phase: null,
              startedAt: aiMentionsStartedAt,
              completedAt: Date.now(),
              error: mentionExecution.diagnostics.degraded
                ? 'AI mentions completed with fallback prompts or heuristic analysis.'
                : undefined,
              metrics: mentionExecution.diagnostics.metrics,
            },
          };
          updateLegacyCheck(scan.progress, 6, 'done');
          markAiLaneComplete(
            scan.progress,
            mentionExecution.diagnostics.degraded ? 'AI mentions complete (degraded)' : 'AI mentions complete',
          );
        });

        return { ok: true as const };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[scan-workflow] AI mention testing failed:', error);
        await updateStoredScan((scan) => {
          const currentMetrics = mergeAiMetrics(scan.enrichments?.aiMentions?.metrics, {
            degraded: true,
            enginesPlanned: filteredEngines.length,
          });
          scan.mentionSummary = createFailedMentionSummary(
            crawlData,
            filteredEngines,
            message,
          );
          scan.enrichments = {
            webHealth: getWebHealthEnrichment(scan),
            aiMentions: {
              status: 'failed',
              phase: null,
              startedAt: aiMentionsStartedAt,
              completedAt: Date.now(),
              error: message,
              metrics: currentMetrics,
            },
          };
          updateLegacyCheck(scan.progress, 6, 'error');
          markAiLaneFailed(scan.progress, 'AI mentions failed');
        });
        return { ok: false as const, error: message };
      }
    })();

    const [siteResult, aiResult] = await Promise.all([siteScanPromise, aiMentionPromise]);

    await updateStoredScan((scan) => {
      if (!siteResult.ok) {
        scan.status = 'failed';
        scan.progress.status = 'failed';
        scan.progress.error = siteResult.error;
        for (const check of scan.progress.checks) {
          if (check.status === 'running') {
            check.status = 'error';
          }
        }
        if (scan.enrichments?.aiMentions?.status === 'running') {
          scan.enrichments.aiMentions.status = 'failed';
          scan.enrichments.aiMentions.error = siteResult.error;
          scan.enrichments.aiMentions.completedAt = Date.now();
        }
        return;
      }

      if (!isTerminalAiStatus(scan.enrichments?.aiMentions?.status)) {
        scan.enrichments = {
          webHealth: getWebHealthEnrichment(scan),
          aiMentions: {
            status: aiResult.ok ? 'complete' : aiResult.unavailable ? 'unavailable' : 'failed',
            phase: null,
            startedAt: aiMentionsStartedAt,
            completedAt: Date.now(),
            error: aiResult.ok ? undefined : 'AI mention testing did not complete.',
            metrics: mergeAiMetrics(scan.enrichments?.aiMentions?.metrics, {
              enginesPlanned: filteredEngines.length,
            }),
          },
        };
      }

      scan.status = 'complete';
      scan.progress.status = 'complete';
      scan.completedAt = Date.now();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateStoredScan((scan) => {
      scan.status = 'failed';
      scan.progress.status = 'failed';
      scan.progress.error = message;
      completeRemainingLaneChecks(scan.progress, 'site_scan', 'error');
      completeRemainingLaneChecks(scan.progress, 'ai_mentions', 'error');
      for (const check of scan.progress.checks) {
        if (check.status === 'running') {
          check.status = 'error';
        }
      }
      if (scan.enrichments?.aiMentions?.status === 'running') {
        scan.enrichments.aiMentions.status = 'failed';
        scan.enrichments.aiMentions.error = message;
        scan.enrichments.aiMentions.completedAt = Date.now();
      }
      if (scan.enrichments?.webHealth?.status === 'running') {
        scan.enrichments.webHealth.status = 'unavailable';
        scan.enrichments.webHealth.error = message;
        scan.enrichments.webHealth.completedAt = Date.now();
      }
    });
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}
