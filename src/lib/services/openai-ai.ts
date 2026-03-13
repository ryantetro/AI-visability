import { AIService } from '@/types/services';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function hasOpenAIConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function canUseOpenAI() {
  return hasOpenAIConfig();
}

export const openAiService: AIService = {
  async generateLlmsTxt(context) {
    if (!hasOpenAIConfig()) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'You write concise llms.txt files for business websites. Return plain markdown only. Do not wrap the response in code fences.',
          },
          {
            role: 'user',
            content: [
              `Website URL: ${context.url}`,
              `Title: ${context.title}`,
              `Description: ${context.description}`,
              'Key pages:',
              ...context.pages.map((page) => `- ${page.title}: ${page.url} — ${page.description}`),
              '',
              'Write an llms.txt document with:',
              '1. A title',
              '2. A short summary',
              '3. Key pages as markdown links',
              '4. Clear, factual copy only',
            ].join('\n'),
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('OpenAI returned an empty llms.txt response.');
    }

    return content;
  },
};
