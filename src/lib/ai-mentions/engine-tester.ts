import type { AIEngine, MentionPrompt } from '@/types/ai-mentions';
import { getAIEngineLabel } from '@/lib/ai-engines';

export interface EngineSearchResult {
  url: string;
  title?: string | null;
}

export interface EngineResponse {
  engine: AIEngine;
  prompt: MentionPrompt;
  text: string;
  testedAt: number;
  citations?: string[];
  searchResults?: EngineSearchResult[];
}

export interface EngineQueryFailure {
  engine: AIEngine;
  prompt: MentionPrompt;
  testedAt: number;
  error: string;
}

export interface EngineTestRun {
  engines: AIEngine[];
  responses: EngineResponse[];
  failures: EngineQueryFailure[];
  metrics: {
    plannedPrompts: number;
    totalExecutions: number;
    executedPrompts: number;
    responsesCollected: number;
    enginesCompleted: number;
  };
}

export interface MentionTesterService {
  query(engine: AIEngine, prompt: MentionPrompt): Promise<EngineResponse>;
  availableEngines(): AIEngine[];
  supportsProviderPacing?: boolean;
}

export interface EngineTestProgress {
  plannedPrompts: number;
  totalExecutions: number;
  executedPrompts: number;
  responsesCollected: number;
  enginesPlanned: number;
  enginesCompleted: number;
  currentStep: string;
  activeEngine?: AIEngine;
}

interface RunEngineTestOptions {
  maxDurationMs?: number;
  onProgress?: (progress: EngineTestProgress) => void | Promise<void>;
}

const CLAUDE_MIN_INTERVAL_MS = 15_000;
const CLAUDE_RATE_LIMIT_BACKOFF_MS = 30_000;
const CLAUDE_MAX_RATE_LIMIT_RETRIES = 2;

function isRateLimitedError(message: string): boolean {
  return /429|rate limit/i.test(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function markRemainingAsSkipped(
  failures: EngineQueryFailure[],
  prompts: MentionPrompt[],
  engine: AIEngine,
  startIndex: number,
  reason: string,
) {
  for (let i = startIndex; i < prompts.length; i += 1) {
    failures.push({
      engine,
      prompt: prompts[i],
      testedAt: Date.now(),
      error: reason,
    });
  }
}

export async function runEngineTests(
  tester: MentionTesterService,
  prompts: MentionPrompt[],
  options?: RunEngineTestOptions,
): Promise<EngineTestRun> {
  const engines = tester.availableEngines();
  const responses: EngineResponse[] = [];
  const failures: EngineQueryFailure[] = [];
  const startedAt = Date.now();
  const maxDurationMs = options?.maxDurationMs ?? null;
  const totalExecutions = prompts.length * engines.length;
  let executedPrompts = 0;
  let responsesCollected = 0;
  let enginesCompleted = 0;
  let stopRequested = false;
  const shouldRespectProviderPacing = tester.supportsProviderPacing === true;

  console.log(`[engine-tester] Testing ${prompts.length} prompts across ${engines.length} engines (${engines.join(', ')})`);

  async function emitProgress(currentStep: string, activeEngine?: AIEngine) {
    await options?.onProgress?.({
      plannedPrompts: prompts.length,
      totalExecutions,
      executedPrompts,
      responsesCollected,
      enginesPlanned: engines.length,
      enginesCompleted,
      currentStep,
      activeEngine,
    });
  }

  function hasExceededBudget() {
    return maxDurationMs !== null && Date.now() - startedAt >= maxDurationMs;
  }

  async function runEngineLane(engine: AIEngine) {
    const engineLabel = getAIEngineLabel(engine);
    let nextAllowedAt = Date.now();

    for (let index = 0; index < prompts.length; index += 1) {
      if (stopRequested || hasExceededBudget()) {
        stopRequested = true;
        const remaining = prompts.length - index;
        markRemainingAsSkipped(
          failures,
          prompts,
          engine,
          index,
          `Skipped due to engine test time budget (${maxDurationMs}ms)`
        );
        executedPrompts += remaining;
        if (remaining > 0) {
          await emitProgress(`Stopping ${engineLabel} early to preserve AI mention budget`, engine);
        }
        break;
      }

      const prompt = prompts[index];
      const ordinal = index + 1;
      let attempt = 0;

      while (true) {
        if (engine === 'claude' && shouldRespectProviderPacing) {
          const waitMs = Math.max(0, nextAllowedAt - Date.now());
          if (waitMs > 0) {
            await emitProgress(`Waiting for Claude rate limit window (${ordinal}/${prompts.length})`, engine);
            await sleep(waitMs);
          }
        }

        await emitProgress(`Testing ${engineLabel} ${ordinal}/${prompts.length}`, engine);

        try {
          const response = await tester.query(engine, prompt);
          responses.push(response);
          responsesCollected += 1;
          executedPrompts += 1;
          if (engine === 'claude' && shouldRespectProviderPacing) {
            nextAllowedAt = Date.now() + CLAUDE_MIN_INTERVAL_MS;
          }
          break;
        } catch (error) {
          const reason = error as
            | (Error & { engine?: AIEngine; prompt?: MentionPrompt; message?: string })
            | { engine?: AIEngine; prompt?: MentionPrompt; message?: string };
          const message = reason instanceof Error ? reason.message : reason?.message ?? String(error);
          const isClaudeRateLimit = engine === 'claude' && isRateLimitedError(message);

          if (shouldRespectProviderPacing && isClaudeRateLimit && attempt < CLAUDE_MAX_RATE_LIMIT_RETRIES && !hasExceededBudget()) {
            attempt += 1;
            const backoffMs = Math.max(CLAUDE_MIN_INTERVAL_MS, CLAUDE_RATE_LIMIT_BACKOFF_MS * attempt);
            nextAllowedAt = Date.now() + backoffMs;
            console.warn(`[engine-tester] Claude rate-limited on prompt ${ordinal}/${prompts.length}; backing off for ${backoffMs}ms before retry ${attempt}`);
            await emitProgress(`Claude rate-limited, retrying ${ordinal}/${prompts.length}`, engine);
            await sleep(backoffMs);
            continue;
          }

          failures.push({
            engine,
            prompt,
            testedAt: Date.now(),
            error: message,
          });
          executedPrompts += 1;
          if (engine === 'claude' && shouldRespectProviderPacing) {
            nextAllowedAt = Date.now() + CLAUDE_MIN_INTERVAL_MS;
          }
          console.error('[engine-tester] Engine query failed:', message);
          break;
        }
      }
    }

    enginesCompleted += 1;
    await emitProgress(`${engineLabel} complete`, engine);
  }

  await Promise.all(engines.map((engine) => runEngineLane(engine)));

  console.log(`[engine-tester] Total results: ${responses.length}`);
  return {
    engines,
    responses,
    failures,
    metrics: {
      plannedPrompts: prompts.length,
      totalExecutions,
      executedPrompts,
      responsesCollected,
      enginesCompleted,
    },
  };
}

export async function testAllEngines(
  tester: MentionTesterService,
  prompts: MentionPrompt[]
): Promise<EngineResponse[]> {
  const run = await runEngineTests(tester, prompts);
  return run.responses;
}
