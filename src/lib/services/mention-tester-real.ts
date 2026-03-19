import type { AIEngine, MentionPrompt } from '@/types/ai-mentions';
import type {
  MentionTesterService,
  EngineResponse,
  EngineSearchResult,
} from '@/lib/ai-mentions/engine-tester';
import { getAIEngineModel, getConfiguredAIEngines } from '@/lib/ai-engines';

const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS || process.env.AI_ENGINE_TIMEOUT_MS || 20000);

interface QueryResult {
  text: string;
  citations?: string[];
  searchResults?: EngineSearchResult[];
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function queryOpenAI(prompt: string): Promise<QueryResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
  };
}

async function queryAnthropic(prompt: string): Promise<QueryResult> {
  const model = getAIEngineModel('claude');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    }, ANTHROPIC_TIMEOUT_MS).catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Anthropic API timeout after ${ANTHROPIC_TIMEOUT_MS}ms`);
      }
      throw error;
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.content?.[0]?.text ?? '',
      };
    }

    const body = await res.text().catch(() => '');
    const isTransient = res.status === 429 || res.status === 529 || res.status >= 500;
    if (attempt === 0 && isTransient) {
      console.warn(`[mention-tester-real] claude transient error ${res.status}, retrying once`);
      continue;
    }
    throw new Error(`Anthropic API error: ${res.status}${body ? ` ${body.slice(0, 240)}` : ''}`);
  }

  throw new Error('Anthropic API error: retry exhausted');
}

async function queryGoogle(prompt: string): Promise<QueryResult> {
  const key = process.env.GOOGLE_GENAI_API_KEY;
  if (!key) throw new Error('GOOGLE_GENAI_API_KEY is not set');

  const model = getAIEngineModel('gemini');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google GenAI API error: ${res.status} ${body}`);
  }
  const data = await res.json();

  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
    throw new Error(`Gemini blocked response: finishReason=${finishReason}`);
  }

  return {
    text: candidate?.content?.parts?.[0]?.text ?? '',
  };
}

async function queryPerplexity(prompt: string): Promise<QueryResult> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY is not set');

  const model = getAIEngineModel('perplexity');
  const res = await fetch('https://api.perplexity.ai/v1/sonar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Perplexity API error: ${res.status}${body ? ` ${body.slice(0, 240)}` : ''}`);
  }
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    citations: Array.isArray(data.citations)
      ? data.citations.filter((value: unknown): value is string => typeof value === 'string')
      : [],
    searchResults: Array.isArray(data.search_results)
      ? data.search_results
          .filter((value: unknown): value is { url?: unknown; title?: unknown } => typeof value === 'object' && value !== null)
          .flatMap((value: { url?: unknown; title?: unknown }) => typeof value.url === 'string'
            ? [{
                url: value.url,
                title: typeof value.title === 'string' ? value.title : null,
              }]
            : [])
      : [],
  };
}

const engineQueryMap: Record<AIEngine, (prompt: string) => Promise<QueryResult>> = {
  chatgpt: queryOpenAI,
  claude: queryAnthropic,
  gemini: queryGoogle,
  perplexity: queryPerplexity,
};

export const realMentionTester: MentionTesterService = {
  async query(engine: AIEngine, prompt: MentionPrompt): Promise<EngineResponse> {
    const queryFn = engineQueryMap[engine];
    try {
      const result = await queryFn(prompt.text);
      return {
        engine,
        prompt,
        text: result.text,
        testedAt: Date.now(),
        citations: result.citations,
        searchResults: result.searchResults,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[mention-tester-real] ${engine} failed for prompt "${prompt.id}": ${message}`);
      const failure = new Error(message) as Error & { engine: AIEngine; prompt: MentionPrompt };
      failure.engine = engine;
      failure.prompt = prompt;
      throw failure;
    }
  },

  availableEngines(): AIEngine[] {
    return getConfiguredAIEngines();
  },
};

export function canUseMentionTester(): boolean {
  return getConfiguredAIEngines().length > 0;
}
