import { randomUUID } from 'node:crypto';
import { computeScore } from '@/lib/ai-mentions/mention-analyzer';
import { analyzeResponsesWithLLM } from '@/lib/ai-mentions/llm-response-analyzer';
import { buildBusinessProfile } from '@/lib/ai-mentions/prompt-generator';
import type { MentionTesterService } from '@/lib/ai-mentions/engine-tester';
import { getUserAccess } from '@/lib/access';
import { getCurrentBillingReadiness } from '@/lib/billing';
import { getScannableEngines, getSelectedPlatforms } from '@/lib/platform-gating';
import { applyRegionContext, DEFAULT_REGION_ID, getSelectedRegions } from '@/lib/region-gating';
import { getDatabase, getMentionTester, getPromptMonitoring } from '@/lib/services/registry';
import { getSupabaseClient } from '@/lib/supabase';
import type { AIEngine, BusinessProfile, MentionPrompt, MentionResult } from '@/types/ai-mentions';
import type { CrawlData } from '@/types/crawler';
import type { DatabaseService, MonitoredPrompt, PromptMonitoringService, PromptResult } from '@/types/services';

const VALID_CATEGORIES: MentionPrompt['category'][] = [
  'direct', 'category', 'comparison', 'recommendation',
  'workflow', 'use-case', 'problem-solution', 'buyer-intent',
];

const PRODUCT_TRIGGER_STALE_AFTER_MS = 12 * 60 * 60 * 1000;
const PRODUCT_TRIGGER_DEDUPE_MS = 5 * 60 * 1000;

const queuedRunAtByDomain = new Map<string, number>();
const inFlightDomains = new Set<string>();

interface PromptRuntime {
  engines: AIEngine[];
  primaryRegionId: string;
  blocked: boolean;
}

export interface PromptMonitoringRunResult {
  domain: string;
  promptsConsidered: number;
  promptsChecked: number;
  promptErrors: number;
  engineCalls: number;
  successfulEngineCalls: number;
  budgetExhausted: boolean;
  runExecuted: boolean;
  reason: string | null;
}

export interface PromptMonitoringRunPlan {
  shouldQueue: boolean;
  promptIds: string[];
  reason: 'no-active-prompts' | 'missing-results' | 'stale-results' | 'fresh-results';
}

interface PromptMonitoringRunDependencies {
  promptMonitoring?: PromptMonitoringService;
  mentionTester?: MentionTesterService;
  database?: Pick<DatabaseService, 'findLatestScanByDomain'>;
  businessProfileResolver?: (domain: string) => Promise<BusinessProfile>;
  promptRuntimeResolver?: (params: {
    prompt: MonitoredPrompt;
    domain: string;
    allEngines: AIEngine[];
  }) => Promise<PromptRuntime>;
}

interface RunPromptMonitoringForDomainOptions {
  domain: string;
  promptIds?: string[];
  maxEngineCalls?: number;
  deadlineAt?: number;
  deps?: PromptMonitoringRunDependencies;
}

interface QueuePromptMonitoringRunOptions extends RunPromptMonitoringForDomainOptions {
  schedule: (task: () => void | Promise<void>) => void;
  source: string;
}

function isValidCategory(cat: string): cat is MentionPrompt['category'] {
  return (VALID_CATEGORIES as string[]).includes(cat);
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return monday.toISOString().slice(0, 10);
}

function normalizeCompetitorKey(value: string): string {
  return value.toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9]+/g, '');
}

async function resolveMonitoringBusinessProfile(
  domain: string,
  database: Pick<DatabaseService, 'findLatestScanByDomain'>,
): Promise<BusinessProfile> {
  const latestScan = await database.findLatestScanByDomain(domain);

  const crawlData = latestScan?.crawlData as CrawlData | undefined;
  if (crawlData?.url) {
    return buildBusinessProfile(crawlData);
  }

  const summary = latestScan?.mentionSummary as
    | { competitorDiscovery?: { businessProfile?: BusinessProfile } }
    | undefined;
  if (summary?.competitorDiscovery?.businessProfile) {
    return summary.competitorDiscovery.businessProfile;
  }

  const brand = domain
    .replace(/\.(com|net|org|co|io|ai|app|biz|us|ca|dev|shop|store)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    brand,
    domain,
    industry: 'Technology',
    location: undefined,
    vertical: 'general',
    businessType: 'unknown',
    siteModel: 'unknown',
    categoryPhrases: [],
    productCategories: [],
    serviceSignals: [],
    geoSignals: [],
    similarityKeywords: [],
    scanCompetitorSeeds: [],
  };
}

function getPreviousRunScore(results: Array<{ runWeightedScore: number | null }>): number | null {
  for (const result of results) {
    if (result.runWeightedScore != null) return result.runWeightedScore;
  }
  return null;
}

function getPreviousCompetitorPositionMap(results: Array<{
  engine: AIEngine;
  competitorsJson: Array<{ name: string; position: number | null }> | null;
}>): Map<string, number | null> {
  const map = new Map<string, number | null>();

  for (const result of results) {
    for (const competitor of result.competitorsJson ?? []) {
      const key = `${result.engine}::${normalizeCompetitorKey(competitor.name)}`;
      if (!map.has(key)) {
        map.set(key, competitor.position ?? null);
      }
    }
  }

  return map;
}

async function resolveDefaultPromptRuntime(
  prompt: MonitoredPrompt,
  domain: string,
  allEngines: AIEngine[],
  cache: Map<string, PromptRuntime>,
): Promise<PromptRuntime> {
  const cacheKey = `${prompt.userId}:${domain}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const fallback: PromptRuntime = {
    engines: allEngines,
    primaryRegionId: DEFAULT_REGION_ID,
    blocked: false,
  };

  if (!prompt.userId) {
    cache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    const supabase = getSupabaseClient();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', prompt.userId)
      .single();

    if (!profile?.email) {
      cache.set(cacheKey, fallback);
      return fallback;
    }

    const [access, selectedPlatforms, selectedRegions, readiness] = await Promise.all([
      getUserAccess(prompt.userId, profile.email),
      getSelectedPlatforms(prompt.userId, domain),
      getSelectedRegions(prompt.userId, domain),
      getCurrentBillingReadiness(prompt.userId, profile.email),
    ]);

    const blocked = readiness.snapshot.issues.some((issue) => (
      issue.memberUserId === prompt.userId
      && (
        issue.category === 'prompts'
        || (issue.category === 'platforms' && issue.domain === domain)
        || (issue.category === 'regions' && issue.domain === domain)
      )
    ));

    const runtime: PromptRuntime = {
      engines: blocked
        ? []
        : getScannableEngines(selectedPlatforms, access.tier, allEngines),
      primaryRegionId: selectedRegions?.[0] ?? DEFAULT_REGION_ID,
      blocked,
    };

    cache.set(cacheKey, runtime);
    return runtime;
  } catch {
    cache.set(cacheKey, fallback);
    return fallback;
  }
}

export function buildPromptMonitoringRunPlan(
  prompts: MonitoredPrompt[],
  results: PromptResult[],
  options?: { staleAfterMs?: number },
): PromptMonitoringRunPlan {
  const staleAfterMs = options?.staleAfterMs ?? PRODUCT_TRIGGER_STALE_AFTER_MS;
  const activePrompts = prompts.filter((prompt) => prompt.active);

  if (activePrompts.length === 0) {
    return {
      shouldQueue: false,
      promptIds: [],
      reason: 'no-active-prompts',
    };
  }

  if (results.length === 0) {
    return {
      shouldQueue: true,
      promptIds: activePrompts.map((prompt) => prompt.id),
      reason: 'missing-results',
    };
  }

  const resultPromptIds = new Set(results.map((result) => result.promptId));
  const missingPromptIds = activePrompts
    .map((prompt) => prompt.id)
    .filter((promptId) => !resultPromptIds.has(promptId));

  if (missingPromptIds.length > 0) {
    return {
      shouldQueue: true,
      promptIds: missingPromptIds,
      reason: 'missing-results',
    };
  }

  const latestResultAt = results.reduce((latest, result) => {
    const timestamp = Date.parse(result.testedAt);
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);

  if (!latestResultAt || (Date.now() - latestResultAt) > staleAfterMs) {
    return {
      shouldQueue: true,
      promptIds: activePrompts.map((prompt) => prompt.id),
      reason: 'stale-results',
    };
  }

  return {
    shouldQueue: false,
    promptIds: [],
    reason: 'fresh-results',
  };
}

function cleanupQueuedRuns(now: number) {
  for (const [key, queuedAt] of queuedRunAtByDomain.entries()) {
    if ((now - queuedAt) > PRODUCT_TRIGGER_DEDUPE_MS) {
      queuedRunAtByDomain.delete(key);
    }
  }
}

export function queuePromptMonitoringRun({
  domain,
  promptIds,
  maxEngineCalls,
  deps,
  schedule,
  source,
}: QueuePromptMonitoringRunOptions): boolean {
  const normalizedDomain = domain.trim().toLowerCase();
  const now = Date.now();
  cleanupQueuedRuns(now);

  if (inFlightDomains.has(normalizedDomain)) return false;
  const lastQueuedAt = queuedRunAtByDomain.get(normalizedDomain);
  if (lastQueuedAt && (now - lastQueuedAt) < PRODUCT_TRIGGER_DEDUPE_MS) {
    return false;
  }

  queuedRunAtByDomain.set(normalizedDomain, now);

  schedule(async () => {
    if (inFlightDomains.has(normalizedDomain)) return;
    inFlightDomains.add(normalizedDomain);

    try {
      const summary = await runPromptMonitoringForDomain({
        domain: normalizedDomain,
        promptIds,
        maxEngineCalls,
        deps,
      });
      console.info(`[prompt-monitoring] ${source} domain=${normalizedDomain} checked=${summary.promptsChecked} errors=${summary.promptErrors} calls=${summary.engineCalls} ok=${summary.successfulEngineCalls} reason=${summary.reason ?? 'ok'}`);
    } catch (error) {
      console.error(`[prompt-monitoring] ${source} domain=${normalizedDomain} failed`, error);
    } finally {
      inFlightDomains.delete(normalizedDomain);
      queuedRunAtByDomain.set(normalizedDomain, Date.now());
    }
  });

  return true;
}

export async function runPromptMonitoringForDomain({
  domain,
  promptIds,
  maxEngineCalls = Number.POSITIVE_INFINITY,
  deadlineAt,
  deps,
}: RunPromptMonitoringForDomainOptions): Promise<PromptMonitoringRunResult> {
  const pm = deps?.promptMonitoring ?? getPromptMonitoring();
  const tester = deps?.mentionTester ?? getMentionTester();
  const database = deps?.database ?? getDatabase();
  const businessProfileResolver = deps?.businessProfileResolver
    ?? ((targetDomain: string) => resolveMonitoringBusinessProfile(targetDomain, database));
  const allEngines = tester.availableEngines();
  const promptIdFilter = promptIds ? new Set(promptIds) : null;
  const runtimeCache = new Map<string, PromptRuntime>();

  const prompts = await pm.listPrompts(domain);
  const activePrompts = prompts.filter((prompt) => (
    prompt.active && (!promptIdFilter || promptIdFilter.has(prompt.id))
  ));

  if (activePrompts.length === 0) {
    return {
      domain,
      promptsConsidered: 0,
      promptsChecked: 0,
      promptErrors: 0,
      engineCalls: 0,
      successfulEngineCalls: 0,
      budgetExhausted: false,
      runExecuted: false,
      reason: 'no-active-prompts',
    };
  }

  if (allEngines.length === 0) {
    return {
      domain,
      promptsConsidered: activePrompts.length,
      promptsChecked: 0,
      promptErrors: 0,
      engineCalls: 0,
      successfulEngineCalls: 0,
      budgetExhausted: false,
      runExecuted: false,
      reason: 'no-engines',
    };
  }

  const previousResults = await pm.listPromptResults(domain, 500);
  const businessProfile = await businessProfileResolver(domain);
  const pendingResponses: Array<{
    promptId: string;
    engine: AIEngine;
    response: {
      engine: AIEngine;
      prompt: MentionPrompt;
      text: string;
      testedAt: number;
      citations?: string[];
      searchResults?: Array<{ url: string; title?: string | null }>;
    };
  }> = [];
  let promptErrors = 0;
  let engineCalls = 0;
  let successfulEngineCalls = 0;
  let budgetExhausted = false;

  function hasDeadlineExpired() {
    return Number.isFinite(deadlineAt) && Date.now() >= (deadlineAt as number);
  }

  for (const prompt of activePrompts) {
    if (budgetExhausted || hasDeadlineExpired()) {
      budgetExhausted = true;
      break;
    }

    const runtime = deps?.promptRuntimeResolver
      ? await deps.promptRuntimeResolver({ prompt, domain, allEngines })
      : await resolveDefaultPromptRuntime(prompt, domain, allEngines, runtimeCache);

    if (runtime.blocked || runtime.engines.length === 0) continue;

    const mentionPrompt: MentionPrompt = {
      id: prompt.id,
      text: applyRegionContext(prompt.promptText, runtime.primaryRegionId),
      category: isValidCategory(prompt.category) ? prompt.category : 'direct',
      industry: prompt.industry ?? businessProfile.industry,
      brand: businessProfile.brand,
    };

    for (const engine of runtime.engines) {
      if (engineCalls >= maxEngineCalls || hasDeadlineExpired()) {
        budgetExhausted = true;
        break;
      }

      engineCalls += 1;

      try {
        const response = await tester.query(engine, mentionPrompt);
        pendingResponses.push({ promptId: prompt.id, engine, response });
        successfulEngineCalls += 1;
      } catch {
        promptErrors += 1;
      }
    }
  }

  if (pendingResponses.length === 0) {
    return {
      domain,
      promptsConsidered: activePrompts.length,
      promptsChecked: 0,
      promptErrors,
      engineCalls,
      successfulEngineCalls,
      budgetExhausted,
      runExecuted: false,
      reason: budgetExhausted ? 'budget-exhausted' : 'no-responses',
    };
  }

  const analysisBudgetMs = deadlineAt
    ? Math.max(1, deadlineAt - Date.now())
    : undefined;

  const analyzedResults = await analyzeResponsesWithLLM(
    pendingResponses.map((entry) => entry.response),
    {
      brand: businessProfile.brand,
      domain,
      businessProfile,
    },
    analysisBudgetMs
      ? {
          totalBudgetMs: analysisBudgetMs,
          timeoutMs: Math.min(12_000, analysisBudgetMs),
        }
      : undefined,
  );

  const monitoringRunId = randomUUID();
  const runWeightedScore = computeScore(analyzedResults);
  const previousRunScore = getPreviousRunScore(previousResults);
  const runScoreDelta = previousRunScore != null
    ? Math.round((runWeightedScore - previousRunScore) * 10) / 10
    : null;
  const notableScoreChange = runScoreDelta != null && Math.abs(runScoreDelta) > 10;
  const previousPositions = getPreviousCompetitorPositionMap(previousResults);
  const weekStart = getWeekStart();
  let promptsChecked = 0;

  for (let index = 0; index < analyzedResults.length; index += 1) {
    if (hasDeadlineExpired()) {
      budgetExhausted = true;
      break;
    }

    const analysis = analyzedResults[index] as MentionResult;
    const pending = pendingResponses[index];
    const testedAt = new Date(analysis.testedAt).toISOString();

    try {
      await pm.savePromptResult({
        promptId: pending.promptId,
        domain,
        engine: pending.engine,
        mentioned: analysis.mentioned,
        mentionType: analysis.mentionType,
        position: analysis.position,
        positionContext: analysis.positionContext,
        sentiment: analysis.sentiment,
        sentimentLabel: analysis.sentimentLabel,
        sentimentStrength: analysis.sentimentStrength,
        sentimentReasoning: analysis.sentimentReasoning,
        keyQuote: analysis.keyQuote,
        citationPresent: analysis.citationPresent,
        citationUrls: analysis.citationUrls,
        descriptionAccuracy: analysis.descriptionAccuracy,
        analysisSource: analysis.analysisSource,
        competitorsJson: analysis.competitorsWithPositions,
        monitoringRunId,
        runWeightedScore,
        runScoreDelta,
        notableScoreChange,
        rawSnippet: analysis.rawSnippet,
        testedAt,
      });
    } catch (error) {
      promptErrors += 1;
      console.error(`[prompt-monitoring] failed saving prompt result for ${domain} prompt=${pending.promptId} engine=${pending.engine}`, error);
      return {
        domain,
        promptsConsidered: activePrompts.length,
        promptsChecked,
        promptErrors,
        engineCalls,
        successfulEngineCalls,
        budgetExhausted,
        runExecuted: promptsChecked > 0,
        reason: 'save-failed',
      };
    }

    for (const competitor of analysis.competitorsWithPositions) {
      try {
        const competitorKey = `${pending.engine}::${normalizeCompetitorKey(competitor.name)}`;
        const previousPosition = previousPositions.get(competitorKey) ?? null;
        const movementDelta = previousPosition != null && competitor.position != null
          ? previousPosition - competitor.position
          : null;

        await pm.saveCompetitorAppearance({
          domain,
          competitor: competitor.name,
          competitorDomain: null,
          engine: pending.engine,
          promptId: pending.promptId,
          position: competitor.position,
          previousPosition,
          movementDelta,
          isNewCompetitor: !previousPositions.has(competitorKey),
          coMentioned: analysis.mentioned,
          weekStart,
        });
      } catch {
        // Competitor rollups are non-critical; keep the run moving.
      }
    }

    promptsChecked += 1;
  }

  return {
    domain,
    promptsConsidered: activePrompts.length,
    promptsChecked,
    promptErrors,
    engineCalls,
    successfulEngineCalls,
    budgetExhausted,
    runExecuted: true,
    reason: budgetExhausted ? 'budget-exhausted' : null,
  };
}
