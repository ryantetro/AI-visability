import { CheckResult } from '@/types/score';
import { CrawlData } from '@/types/crawler';

export function runAiRegistrationChecks(data: CrawlData): CheckResult[] {
  const robots = data.robotsTxt;

  return [
    {
      id: 'ar-gptbot',
      dimension: 'ai-registration',
      category: 'ai',
      label: 'GPTBot access allowed',
      verdict: !robots.exists ? 'unknown' : robots.allowsGPTBot ? 'pass' : 'fail',
      points: robots.allowsGPTBot ? 3 : 0,
      maxPoints: 3,
      detail: !robots.exists
        ? 'No robots.txt to check GPTBot status.'
        : robots.allowsGPTBot
        ? 'GPTBot is allowed to crawl your site.'
        : 'GPTBot is blocked in robots.txt. Allow it to appear in ChatGPT.',
    },
    {
      id: 'ar-perplexity',
      dimension: 'ai-registration',
      category: 'ai',
      label: 'PerplexityBot access allowed',
      verdict: !robots.exists ? 'unknown' : robots.allowsPerplexityBot ? 'pass' : 'fail',
      points: robots.allowsPerplexityBot ? 3 : 0,
      maxPoints: 3,
      detail: !robots.exists
        ? 'No robots.txt to check PerplexityBot status.'
        : robots.allowsPerplexityBot
        ? 'PerplexityBot is allowed to crawl your site.'
        : 'PerplexityBot is blocked. Allow it to appear in Perplexity search.',
    },
    {
      id: 'ar-claude',
      dimension: 'ai-registration',
      category: 'ai',
      label: 'Claude/Anthropic bot access',
      verdict: !robots.exists ? 'unknown' : robots.allowsClaudeBot ? 'pass' : 'fail',
      points: robots.allowsClaudeBot ? 2 : 0,
      maxPoints: 2,
      detail: !robots.exists
        ? 'No robots.txt to check Claude bot status.'
        : robots.allowsClaudeBot
        ? 'Anthropic/Claude bots are allowed.'
        : 'Anthropic/Claude bots appear to be blocked.',
    },
    {
      id: 'ar-llms-refs',
      dimension: 'ai-registration',
      category: 'ai',
      label: 'llms.txt has reference links',
      verdict: !data.llmsTxt.exists ? 'unknown' : data.llmsTxt.links.length >= 2 ? 'pass' : 'fail',
      points: data.llmsTxt.exists && data.llmsTxt.links.length >= 2 ? 2 : 0,
      maxPoints: 2,
      detail: !data.llmsTxt.exists
        ? 'No llms.txt present to check.'
        : data.llmsTxt.links.length >= 2
        ? `llms.txt contains ${data.llmsTxt.links.length} reference links.`
        : 'llms.txt has fewer than 2 reference links. Add links to key pages.',
    },
  ];
}
