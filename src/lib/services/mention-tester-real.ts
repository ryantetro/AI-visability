import type { AIEngine, MentionPrompt } from '@/types/ai-mentions';
import type { MentionTesterService, EngineResponse } from '@/lib/ai-mentions/engine-tester';

async function queryOpenAI(prompt: string): Promise<string> {
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
  return data.choices?.[0]?.message?.content ?? '';
}

async function queryAnthropic(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function queryGoogle(prompt: string): Promise<string> {
  const key = process.env.GOOGLE_GENAI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) throw new Error(`Google GenAI API error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function queryPerplexity(prompt: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    }),
  });

  if (!res.ok) throw new Error(`Perplexity API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

const engineQueryMap: Record<AIEngine, (prompt: string) => Promise<string>> = {
  chatgpt: queryOpenAI,
  claude: queryAnthropic,
  gemini: queryGoogle,
  perplexity: queryPerplexity,
};

const engineKeyMap: Record<AIEngine, string> = {
  chatgpt: 'OPENAI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GOOGLE_GENAI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
};

export const realMentionTester: MentionTesterService = {
  async query(engine: AIEngine, prompt: MentionPrompt): Promise<EngineResponse> {
    const queryFn = engineQueryMap[engine];
    const text = await queryFn(prompt.text);

    return {
      engine,
      prompt,
      text,
      testedAt: Date.now(),
    };
  },

  availableEngines(): AIEngine[] {
    return (['chatgpt', 'perplexity', 'gemini', 'claude'] as AIEngine[]).filter(
      (engine) => Boolean(process.env[engineKeyMap[engine]])
    );
  },
};

export function canUseMentionTester(): boolean {
  return Object.values(engineKeyMap).some((key) => Boolean(process.env[key]));
}
