import type { AIEngine, MentionPrompt } from '@/types/ai-mentions';

export interface EngineResponse {
  engine: AIEngine;
  prompt: MentionPrompt;
  text: string;
  testedAt: number;
}

export interface MentionTesterService {
  query(engine: AIEngine, prompt: MentionPrompt): Promise<EngineResponse>;
  availableEngines(): AIEngine[];
}

export async function testAllEngines(
  tester: MentionTesterService,
  prompts: MentionPrompt[]
): Promise<EngineResponse[]> {
  const engines = tester.availableEngines();
  const results: EngineResponse[] = [];

  for (const prompt of prompts) {
    const engineResults = await Promise.allSettled(
      engines.map((engine) => tester.query(engine, prompt))
    );

    for (const result of engineResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  return results;
}
