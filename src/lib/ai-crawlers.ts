export type AiCrawlerCategory = 'indexing' | 'citation' | 'training' | 'unknown';
export type AiCrawlerProvider = 'chatgpt' | 'perplexity' | 'gemini' | 'claude' | 'other';

type AiCrawlerDefinition = {
  botName: string;
  category: AiCrawlerCategory;
  company: string;
  provider: AiCrawlerProvider;
  matchInUserAgent?: string;
};

const AI_CRAWLER_DEFINITIONS: AiCrawlerDefinition[] = [
  { botName: 'GPTBot', category: 'indexing', company: 'OpenAI', provider: 'chatgpt', matchInUserAgent: 'GPTBot' },
  { botName: 'ChatGPT-User', category: 'indexing', company: 'OpenAI', provider: 'chatgpt', matchInUserAgent: 'ChatGPT-User' },
  { botName: 'PerplexityBot', category: 'citation', company: 'Perplexity', provider: 'perplexity', matchInUserAgent: 'PerplexityBot' },
  { botName: 'ClaudeBot', category: 'indexing', company: 'Anthropic', provider: 'claude', matchInUserAgent: 'ClaudeBot' },
  { botName: 'Claude-Web', category: 'indexing', company: 'Anthropic', provider: 'claude', matchInUserAgent: 'Claude-Web' },
  { botName: 'anthropic-ai', category: 'training', company: 'Anthropic', provider: 'claude', matchInUserAgent: 'anthropic-ai' },
  { botName: 'CCBot', category: 'training', company: 'Common Crawl', provider: 'other', matchInUserAgent: 'CCBot' },
  { botName: 'cohere-ai', category: 'training', company: 'Cohere', provider: 'other', matchInUserAgent: 'cohere-ai' },
  // Google-Extended is a robots.txt token, not a distinct HTTP user-agent. We track
  // live Google fetchers that can realistically appear in request logs, while still
  // preserving Google-Extended as a legacy alias for historical rows.
  { botName: 'GoogleOther', category: 'training', company: 'Google', provider: 'gemini', matchInUserAgent: 'GoogleOther' },
  { botName: 'Google-CloudVertexBot', category: 'training', company: 'Google', provider: 'gemini', matchInUserAgent: 'Google-CloudVertexBot' },
  { botName: 'Google-Extended', category: 'training', company: 'Google', provider: 'gemini' },
];

const DETECTABLE_AI_CRAWLERS = AI_CRAWLER_DEFINITIONS.filter(
  (crawler): crawler is AiCrawlerDefinition & { matchInUserAgent: string } => Boolean(crawler.matchInUserAgent)
);

export const AI_CRAWLER_PROVIDER_ORDER: AiCrawlerProvider[] = ['chatgpt', 'perplexity', 'gemini', 'claude', 'other'];

export const AI_CRAWLER_PROVIDER_LABELS: Record<AiCrawlerProvider, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
  other: 'Other',
};

export const BOT_TO_PROVIDER: Record<string, AiCrawlerProvider> = Object.freeze(
  Object.fromEntries(AI_CRAWLER_DEFINITIONS.map((crawler) => [crawler.botName, crawler.provider]))
) as Record<string, AiCrawlerProvider>;

export const TRACKING_SNIPPET_BOTS: Record<string, AiCrawlerCategory> = Object.freeze(
  Object.fromEntries(DETECTABLE_AI_CRAWLERS.map((crawler) => [crawler.matchInUserAgent, crawler.category]))
) as Record<string, AiCrawlerCategory>;

export function detectAiCrawler(userAgent: string) {
  for (const crawler of DETECTABLE_AI_CRAWLERS) {
    if (userAgent.includes(crawler.matchInUserAgent)) {
      return {
        botName: crawler.botName,
        category: crawler.category,
        company: crawler.company,
        provider: crawler.provider,
      };
    }
  }

  return null;
}

export function getCrawlerProvider(botName: string): AiCrawlerProvider {
  return BOT_TO_PROVIDER[botName] ?? 'other';
}
