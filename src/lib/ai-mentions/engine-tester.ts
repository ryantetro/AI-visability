import type { AIEngine, MentionPrompt } from '@/types/ai-mentions';

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
}

export interface MentionTesterService {
  query(engine: AIEngine, prompt: MentionPrompt): Promise<EngineResponse>;
  availableEngines(): AIEngine[];
}

const PARALLEL_BATCH_SIZE = 4;

export async function runEngineTests(
  tester: MentionTesterService,
  prompts: MentionPrompt[]
): Promise<EngineTestRun> {
  const engines = tester.availableEngines();
  const responses: EngineResponse[] = [];
  const failures: EngineQueryFailure[] = [];

  console.log(`[engine-tester] Testing ${prompts.length} prompts across ${engines.length} engines (${engines.join(', ')})`);

  // Run prompts in parallel batches to stay within API rate limits
  // while avoiding the sequential bottleneck
  for (let i = 0; i < prompts.length; i += PARALLEL_BATCH_SIZE) {
    const batch = prompts.slice(i, i + PARALLEL_BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.flatMap((prompt) =>
        engines.map((engine) =>
          tester.query(engine, prompt).then((res) => ({ prompt, res }))
        )
      )
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        responses.push(result.value.res);
      } else {
        const reason = result.reason as
          | (Error & { engine?: AIEngine; prompt?: MentionPrompt; message?: string })
          | { engine?: AIEngine; prompt?: MentionPrompt; message?: string };
        const engine = reason?.engine;
        const prompt = reason?.prompt;
        const message = reason instanceof Error ? reason.message : reason?.message ?? String(result.reason);
        if (engine && prompt) {
          failures.push({
            engine,
            prompt,
            testedAt: Date.now(),
            error: message,
          });
        }
        console.error(`[engine-tester] Engine query failed:`, message);
      }
    }

    const succeeded = batchResults.filter((r) => r.status === 'fulfilled').length;
    const total = batch.length * engines.length;
    console.log(`[engine-tester] Batch ${Math.floor(i / PARALLEL_BATCH_SIZE) + 1}: ${succeeded}/${total} responses`);
  }

  console.log(`[engine-tester] Total results: ${responses.length}`);
  return { engines, responses, failures };
}

export async function testAllEngines(
  tester: MentionTesterService,
  prompts: MentionPrompt[]
): Promise<EngineResponse[]> {
  const run = await runEngineTests(tester, prompts);
  return run.responses;
}
