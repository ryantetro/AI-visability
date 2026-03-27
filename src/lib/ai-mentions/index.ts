import type { CrawlData } from '@/types/crawler';
import type {
  AIEngine,
  BusinessProfile,
  EngineBreakdown,
  MentionResult,
  MentionPrompt,
  MentionSummary,
  SentimentSummary,
} from '@/types/ai-mentions';
import { buildBusinessProfile, generatePrompts } from './prompt-generator';
import { generatePromptsWithLLM } from './llm-prompt-generator';
import { canUseLLMResponseAnalyzer, analyzeResponsesWithLLM } from './llm-response-analyzer';
import {
  runEngineTests,
  type EngineTestProgress,
  type MentionTesterService,
} from './engine-tester';
import {
  analyzeResponse,
  computeScore,
  computeShareOfVoice,
  computeSentimentSummary,
  computeTopicPerformance,
  computeCompetitorLeaderboard,
} from './mention-analyzer';
import { AI_ENGINES, getAIEngineModel } from '@/lib/ai-engines';
import {
  createEmptyEngineBreakdown,
  createEmptyEngineStatusMap,
  createEngineStatus,
} from './summary';
import { discoverCompetitors } from './competitor-discovery';

const EXECUTION_PROMPT_LIMIT = 15;
const PROMPT_GENERATION_TIMEOUT_MS = 12000;
const ENGINE_TEST_TIMEOUT_MS = 180000;
const RESPONSE_ANALYSIS_TIMEOUT_MS = 12000;
const RESPONSE_ANALYSIS_TOTAL_BUDGET_MS = 60000;
const EXECUTION_PROMPT_TARGETS: Partial<Record<MentionPrompt['category'], number>> = {
  direct: 2,
  'buyer-intent': 3,
  comparison: 3,
  'problem-solution': 2,
  recommendation: 2,
  'use-case': 1,
  category: 1,
  workflow: 1,
};

export type MentionJobPhase =
  | 'queued'
  | 'prompt_generation'
  | 'engine_testing'
  | 'response_analysis'
  | 'finalizing';

export interface MentionJobProgressUpdate {
  phase: MentionJobPhase;
  currentStep: string | null;
  metrics: {
    plannedPrompts: number;
    executedPrompts: number;
    responsesCollected: number;
    enginesPlanned: number;
    enginesCompleted: number;
    degraded: boolean;
  };
}

export interface MentionJobDiagnostics {
  promptSource: 'cache' | 'llm' | 'template';
  analysisMode: 'llm' | 'mixed' | 'heuristic' | 'not_run';
  degraded: boolean;
  metrics: MentionJobProgressUpdate['metrics'];
}

export interface MentionJobResult {
  summary: MentionSummary;
  diagnostics: MentionJobDiagnostics;
}

interface RunMentionJobOptions {
  cachedPrompts?: MentionPrompt[] | null;
  onProgress?: (update: MentionJobProgressUpdate) => void | Promise<void>;
  promptGenerationTimeoutMs?: number;
  engineTestTimeoutMs?: number;
  responseAnalysisTimeoutMs?: number;
  responseAnalysisTotalBudgetMs?: number;
}

function normalizeFingerprintValue(value: string | undefined | null): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueTopSignals(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeFingerprintValue(value)).filter(Boolean))]
    .sort()
    .slice(0, 5);
}

export function buildPromptReuseFingerprint(crawlData: CrawlData): string {
  const businessProfile = buildBusinessProfile(crawlData);

  return JSON.stringify({
    normalizedUrl: normalizeFingerprintValue(crawlData.normalizedUrl ?? crawlData.url),
    brand: normalizeFingerprintValue(businessProfile.brand),
    vertical: businessProfile.vertical,
    businessType: businessProfile.businessType,
    productCategories: uniqueTopSignals(businessProfile.productCategories),
    serviceSignals: uniqueTopSignals(businessProfile.serviceSignals),
  });
}

function createDiagnosticsMetrics(overrides: Partial<MentionJobProgressUpdate['metrics']> = {}): MentionJobProgressUpdate['metrics'] {
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

async function emitProgress(
  callback: RunMentionJobOptions['onProgress'],
  phase: MentionJobPhase,
  currentStep: string | null,
  metrics: MentionJobProgressUpdate['metrics'],
) {
  await callback?.({
    phase,
    currentStep,
    metrics,
  });
}

function limitExecutionPrompts(prompts: MentionPrompt[]): MentionPrompt[] {
  if (prompts.length <= EXECUTION_PROMPT_LIMIT) return prompts;

  const selected: MentionPrompt[] = [];
  const selectedIds = new Set<string>();

  for (const [category, target] of Object.entries(EXECUTION_PROMPT_TARGETS)) {
    const matches = prompts
      .filter((prompt) => prompt.category === category)
      .slice(0, target);

    for (const prompt of matches) {
      if (selectedIds.has(prompt.id)) continue;
      selected.push(prompt);
      selectedIds.add(prompt.id);
    }
  }

  for (const prompt of prompts) {
    if (selected.length >= EXECUTION_PROMPT_LIMIT) break;
    if (selectedIds.has(prompt.id)) continue;
    selected.push(prompt);
    selectedIds.add(prompt.id);
  }

  return selected.slice(0, EXECUTION_PROMPT_LIMIT);
}

function createEmptySentimentSummary(): SentimentSummary {
  const sentimentBreakdown = AI_ENGINES.reduce((acc, engine) => {
    acc[engine] = {
      sentiment: 'not-found',
      averageStrength: 0,
      sampleQuote: null,
    };
    return acc;
  }, {} as SentimentSummary['sentimentBreakdown']);

  return {
    overallSentiment: 'neutral',
    positiveScore: 0,
    averageStrength: 0,
    sentimentBreakdown,
    keyPositiveQuotes: [],
    keyNegativeQuotes: [],
    positives: [],
    negatives: [],
  };
}

function buildMentionSummary(
  crawlData: CrawlData,
  businessProfile: BusinessProfile,
  prompts: MentionPrompt[],
  testerEngines: AIEngine[],
  engineRun: Awaited<ReturnType<typeof runEngineTests>>,
  results: Awaited<ReturnType<typeof analyzeResponsesWithLLM>>,
  testedAt: number,
): MentionSummary {
  const brand = businessProfile.brand;
  const engineBreakdown = createEmptyEngineBreakdown();
  const engineStatus = createEmptyEngineStatusMap();

  for (const engine of AI_ENGINES) {
    const engineResults = results.filter((result) => result.engine === engine);
    const engineFailures = engineRun.failures.filter((failure) => failure.engine === engine);
    const mentioned = engineResults.filter((result) => result.mentioned).length;
    const positions = engineResults
      .filter((result) => result.position !== null)
      .map((result) => result.position!);

    const sentiments = engineResults
      .filter((result) => result.sentimentLabel !== null || result.sentiment !== null)
      .map((result) => result.sentimentLabel ?? result.sentiment!);

    let dominantSentiment: EngineBreakdown['sentiment'] = 'not-found';
    if (mentioned > 0) {
      const counts = { positive: 0, neutral: 0, negative: 0 };
      for (const sentiment of sentiments) {
        const legacySentiment = sentiment === 'mixed' ? 'neutral' : sentiment;
        if (legacySentiment) counts[legacySentiment]++;
      }
      dominantSentiment =
        counts.positive >= counts.neutral && counts.positive >= counts.negative
          ? 'positive'
          : counts.negative >= counts.neutral
            ? 'negative'
            : 'neutral';
    }

    engineBreakdown[engine] = {
      mentioned,
      total: engineResults.length,
      avgPosition:
        positions.length > 0
          ? Math.round((positions.reduce((sum, position) => sum + position, 0) / positions.length) * 10) / 10
          : null,
      sentiment: dominantSentiment,
    };

    const lastTestedAt = [
      ...engineResults.map((result) => result.testedAt),
      ...engineFailures.map((failure) => failure.testedAt),
    ].sort((a, b) => b - a)[0] ?? null;

    if (!testerEngines.includes(engine)) {
      engineStatus[engine] = {
        ...engineStatus[engine],
        status: 'not_configured',
        configured: false,
        model: null,
      };
    } else if (engineResults.length === 0 && engineFailures.length > 0) {
      engineStatus[engine] = {
        ...engineStatus[engine],
        status: 'error',
        configured: true,
        model: getAIEngineModel(engine),
        testedPrompts: prompts.length,
        successfulResponses: 0,
        failedPrompts: engineFailures.length,
        lastTestedAt,
        errorMessage: engineFailures[0]?.error ?? 'Engine query failed',
      };
    } else {
      engineStatus[engine] = {
        ...engineStatus[engine],
        status: 'complete',
        configured: true,
        model: getAIEngineModel(engine),
        testedPrompts: prompts.length,
        successfulResponses: engineResults.length,
        failedPrompts: engineFailures.length,
        lastTestedAt,
        errorMessage: engineFailures[0]?.error ?? null,
      };
    }
  }

  const competitorDiscovery = discoverCompetitors(crawlData, prompts, results, businessProfile);
  const inferredCompetitors = competitorDiscovery.acceptedCompetitors
    .filter((candidate) => candidate.source === 'scan_inferred')
    .map((candidate) => ({
      name: candidate.name,
      confidence: candidate.confidence,
      source: candidate.evidence.some((evidence) => evidence.startsWith('Prompt seed'))
        ? 'prompt_seed' as const
        : 'scan_candidate' as const,
    }));

  const competitorLeaderboard = computeCompetitorLeaderboard(results, prompts, {
    inferredCompetitors,
    acceptedCompetitors: competitorDiscovery.acceptedCompetitors,
    brand,
  });
  const competitorsMentioned = competitorLeaderboard
    .slice()
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || b.visibilityPct - a.visibilityPct || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((entry) => ({ name: entry.name, count: entry.count }));

  const mentionedCount = results.filter((result) => result.mentioned).length;

  return {
    overallScore: computeScore(results),
    engineBreakdown,
    engineStatus,
    results,
    promptsUsed: prompts,
    testedAt,
    competitorsMentioned,
    inferredCompetitors,
    competitorDiscovery,
    visibilityPct: results.length > 0 ? Math.round((mentionedCount / results.length) * 100) : 0,
    shareOfVoice: computeShareOfVoice(results),
    sentimentSummary: computeSentimentSummary(results, brand),
    topicPerformance: computeTopicPerformance(results, prompts),
    competitorLeaderboard,
  };
}

export function createFailedMentionSummary(
  crawlData: CrawlData,
  configuredEngines: AIEngine[],
  errorMessage: string,
): MentionSummary {
  const businessProfile = buildBusinessProfile(crawlData);
  const prompts = limitExecutionPrompts(generatePrompts(crawlData, businessProfile));
  const testedAt = Date.now();
  const engineStatus = createEmptyEngineStatusMap();

  for (const engine of AI_ENGINES) {
    if (!configuredEngines.includes(engine)) {
      engineStatus[engine] = createEngineStatus(engine, 'not_configured', {
        configured: false,
        model: null,
      });
      continue;
    }

    engineStatus[engine] = createEngineStatus(engine, 'error', {
      configured: true,
      model: getAIEngineModel(engine),
      testedPrompts: prompts.length,
      successfulResponses: 0,
      failedPrompts: prompts.length,
      lastTestedAt: testedAt,
      errorMessage,
    });
  }

  return {
    overallScore: 0,
    engineBreakdown: createEmptyEngineBreakdown(),
    engineStatus,
    results: [],
    promptsUsed: prompts,
    testedAt,
    competitorsMentioned: [],
    inferredCompetitors: [],
    visibilityPct: 0,
    shareOfVoice: computeShareOfVoice([]),
    sentimentSummary: createEmptySentimentSummary(),
    topicPerformance: [],
    competitorLeaderboard: [],
  };
}

export async function runMentionTests(
  crawlData: CrawlData,
  tester: MentionTesterService,
  options?: RunMentionJobOptions,
): Promise<MentionSummary> {
  const execution = await runMentionTestJob(crawlData, tester, options);
  return execution.summary;
}

export async function runMentionTestJob(
  crawlData: CrawlData,
  tester: MentionTesterService,
  options?: RunMentionJobOptions,
): Promise<MentionJobResult> {
  const businessProfile = buildBusinessProfile(crawlData);
  const testerEngines = tester.availableEngines();
  const metrics = createDiagnosticsMetrics({
    enginesPlanned: testerEngines.length,
  });

  await emitProgress(options?.onProgress, 'queued', 'Queued for AI mention testing', metrics);

  const promptGenerationTimeoutMs = options?.promptGenerationTimeoutMs ?? PROMPT_GENERATION_TIMEOUT_MS;
  let prompts: MentionPrompt[];
  let promptSource: MentionJobDiagnostics['promptSource'] = 'template';
  let attemptedLLMPromptGeneration = false;

  if (options?.cachedPrompts?.length) {
    promptSource = 'cache';
    prompts = options.cachedPrompts;
    metrics.plannedPrompts = prompts.length;
    await emitProgress(options?.onProgress, 'prompt_generation', 'Reusing recent prompt set', metrics);
  } else if (process.env.OPENAI_API_KEY && process.env.USE_MOCKS !== 'true') {
    try {
      attemptedLLMPromptGeneration = true;
      await emitProgress(options?.onProgress, 'prompt_generation', 'Generating prompts with OpenAI', metrics);
      prompts = await generatePromptsWithLLM(crawlData, businessProfile, {
        timeoutMs: promptGenerationTimeoutMs,
      });
      promptSource = 'llm';
    } catch (err) {
      console.warn('[mention-tests] LLM prompt gen failed, using templates:', err);
      prompts = generatePrompts(crawlData, businessProfile);
      promptSource = 'template';
      metrics.degraded = true;
    }
  } else {
    await emitProgress(options?.onProgress, 'prompt_generation', 'Generating prompt templates', metrics);
    prompts = generatePrompts(crawlData, businessProfile);
  }

  prompts = limitExecutionPrompts(prompts);
  metrics.plannedPrompts = prompts.length;
  metrics.enginesPlanned = testerEngines.length;
  await emitProgress(options?.onProgress, 'engine_testing', `Testing ${prompts.length} prompts across ${testerEngines.length} engines`, metrics);

  const engineRun = await runEngineTests(tester, prompts, {
    maxDurationMs: options?.engineTestTimeoutMs ?? ENGINE_TEST_TIMEOUT_MS,
    onProgress: async (progress: EngineTestProgress) => {
      metrics.executedPrompts = progress.executedPrompts;
      metrics.responsesCollected = progress.responsesCollected;
      metrics.enginesCompleted = progress.enginesCompleted;
      await emitProgress(options?.onProgress, 'engine_testing', progress.currentStep, metrics);
    },
  });
  metrics.executedPrompts = engineRun.metrics.executedPrompts;
  metrics.responsesCollected = engineRun.metrics.responsesCollected;
  metrics.enginesCompleted = engineRun.metrics.enginesCompleted;

  let results: MentionResult[];
  let analysisMode: MentionJobDiagnostics['analysisMode'] = 'not_run';
  let attemptedLLMAnalysis = false;

  if (engineRun.responses.length === 0) {
    results = [];
  } else if (!canUseLLMResponseAnalyzer()) {
    results = engineRun.responses.map((response) =>
      analyzeResponse(response, businessProfile.brand, businessProfile.domain)
    );
    analysisMode = 'heuristic';
  } else {
    attemptedLLMAnalysis = true;
    console.log(
      `[mention-tests] Analyzing ${engineRun.responses.length} responses with LLM budget ${options?.responseAnalysisTotalBudgetMs ?? RESPONSE_ANALYSIS_TOTAL_BUDGET_MS}ms (timeout ${options?.responseAnalysisTimeoutMs ?? RESPONSE_ANALYSIS_TIMEOUT_MS}ms)`
    );
    await emitProgress(
      options?.onProgress,
      'response_analysis',
      `Analyzing ${engineRun.responses.length} responses`,
      metrics,
    );
    results = await analyzeResponsesWithLLM(engineRun.responses, {
      brand: businessProfile.brand,
      domain: businessProfile.domain,
      businessProfile,
    }, {
      timeoutMs: options?.responseAnalysisTimeoutMs ?? RESPONSE_ANALYSIS_TIMEOUT_MS,
      totalBudgetMs: options?.responseAnalysisTotalBudgetMs ?? RESPONSE_ANALYSIS_TOTAL_BUDGET_MS,
    });
    const llmCount = results.filter((result) => result.analysisSource === 'llm').length;
    if (llmCount === results.length) {
      analysisMode = 'llm';
    } else if (llmCount > 0) {
      analysisMode = 'mixed';
      metrics.degraded = true;
    } else {
      analysisMode = 'heuristic';
      metrics.degraded = true;
    }
  }

  if (!attemptedLLMAnalysis && engineRun.responses.length > 0) {
    analysisMode = 'heuristic';
  }

  if (attemptedLLMPromptGeneration && promptSource === 'template') {
    metrics.degraded = true;
  }

  await emitProgress(options?.onProgress, 'finalizing', 'Finalizing AI mention score', metrics);

  const summary = buildMentionSummary(
    crawlData,
    businessProfile,
    prompts,
    testerEngines,
    engineRun,
    results,
    Date.now(),
  );

  const diagnostics: MentionJobDiagnostics = {
    promptSource,
    analysisMode,
    degraded: metrics.degraded,
    metrics: {
      ...metrics,
      degraded: metrics.degraded,
    },
  };

  return {
    summary,
    diagnostics,
  };
}
