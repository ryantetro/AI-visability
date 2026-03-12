import { RobotsTxtData } from '@/types/crawler';

export async function fetchRobotsTxt(baseUrl: string): Promise<RobotsTxtData> {
  const url = new URL('/robots.txt', baseUrl).href;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return emptyRobots();
    }
    const raw = await res.text();
    return parseRobotsTxt(raw);
  } catch {
    return emptyRobots();
  }
}

function emptyRobots(): RobotsTxtData {
  return {
    exists: false,
    raw: '',
    allowsGPTBot: false,
    allowsPerplexityBot: false,
    allowsClaudeBot: false,
    allowsGoogleBot: false,
    sitemapReferences: [],
  };
}

function parseRobotsTxt(raw: string): RobotsTxtData {
  const lines = raw.split('\n');
  const sitemapReferences: string[] = [];
  let currentAgent = '';
  const agentRules: Record<string, { allows: boolean; disallows: boolean }> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;

    const sitemapMatch = trimmed.match(/^sitemap:\s*(.+)/i);
    if (sitemapMatch) {
      sitemapReferences.push(sitemapMatch[1].trim());
      continue;
    }

    const agentMatch = trimmed.match(/^user-agent:\s*(.+)/i);
    if (agentMatch) {
      currentAgent = agentMatch[1].trim().toLowerCase();
      if (!agentRules[currentAgent]) {
        agentRules[currentAgent] = { allows: false, disallows: false };
      }
      continue;
    }

    if (trimmed.match(/^allow:\s*/i)) {
      if (currentAgent) agentRules[currentAgent].allows = true;
    }
    if (trimmed.match(/^disallow:\s*\//i)) {
      if (currentAgent) agentRules[currentAgent].disallows = true;
    }
  }

  function isBotAllowed(botName: string): boolean {
    const bot = botName.toLowerCase();
    const specific = agentRules[bot];
    const wildcard = agentRules['*'];
    // If specifically mentioned with allow and no disallow, or not blocked
    if (specific) {
      if (specific.disallows && !specific.allows) return false;
      if (specific.allows) return true;
    }
    // Fall back to wildcard
    if (wildcard) {
      if (wildcard.disallows && !wildcard.allows) return false;
    }
    // No rules = allowed by default
    return true;
  }

  return {
    exists: true,
    raw,
    allowsGPTBot: isBotAllowed('GPTBot'),
    allowsPerplexityBot: isBotAllowed('PerplexityBot'),
    allowsClaudeBot: isBotAllowed('ClaudeBot') || isBotAllowed('Claude-Web') || isBotAllowed('anthropic-ai'),
    allowsGoogleBot: isBotAllowed('Googlebot'),
    sitemapReferences,
  };
}
