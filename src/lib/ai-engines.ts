import type { AIEngine } from '@/types/ai-mentions';

export const AI_ENGINES: AIEngine[] = ['chatgpt', 'perplexity', 'gemini', 'claude'];

export interface AIEngineMeta {
  id: AIEngine;
  label: string;
  provider: string;
  color: string;
  envKey: string;
  defaultModel: string;
  iconKey: AIEngine;
}

export const AI_ENGINE_META: Record<AIEngine, AIEngineMeta> = {
  chatgpt: {
    id: 'chatgpt',
    label: 'ChatGPT',
    provider: 'OpenAI',
    color: '#74aa9c',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    iconKey: 'chatgpt',
  },
  perplexity: {
    id: 'perplexity',
    label: 'Perplexity',
    provider: 'Perplexity',
    color: '#20B8CD',
    envKey: 'PERPLEXITY_API_KEY',
    defaultModel: 'sonar',
    iconKey: 'perplexity',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    provider: 'Google',
    color: '#4285F4',
    envKey: 'GOOGLE_GENAI_API_KEY',
    defaultModel: 'gemini-2.5-flash',
    iconKey: 'gemini',
  },
  claude: {
    id: 'claude',
    label: 'Claude',
    provider: 'Anthropic',
    color: '#d97757',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-haiku-4-5-20251001',
    iconKey: 'claude',
  },
};

const MODEL_ENV_KEYS: Partial<Record<AIEngine, string>> = {
  perplexity: 'PERPLEXITY_MODEL',
  gemini: 'GEMINI_MODEL',
  claude: 'ANTHROPIC_MODEL',
};

export function getAIEngineMeta(engine: AIEngine): AIEngineMeta {
  return AI_ENGINE_META[engine];
}

export function getAIEngineLabel(engine: AIEngine): string {
  return getAIEngineMeta(engine).label;
}

export function getAIEngineModel(engine: AIEngine): string {
  const envKey = MODEL_ENV_KEYS[engine];
  return (envKey ? process.env[envKey] : undefined) || getAIEngineMeta(engine).defaultModel;
}

export function isAIEngineConfigured(engine: AIEngine): boolean {
  return Boolean(process.env[getAIEngineMeta(engine).envKey]);
}

export function getConfiguredAIEngines(): AIEngine[] {
  return AI_ENGINES.filter(isAIEngineConfigured);
}

export function getMissingAIEngines(available = getConfiguredAIEngines()): AIEngine[] {
  return AI_ENGINES.filter((engine) => !available.includes(engine));
}
