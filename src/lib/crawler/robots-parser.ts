import { RobotsTxtData } from '@/types/crawler';

export async function fetchRobotsTxt(baseUrl: string): Promise<RobotsTxtData> {
  const url = new URL('/robots.txt', baseUrl).href;
  try {
    const res = await fetch(url, {
      headers: requestHeaders('text/plain,text/*;q=0.9,*/*;q=0.8'),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
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
    allowsGoogleExtended: false,
    sitemapReferences: [],
  };
}

function parseRobotsTxt(raw: string): RobotsTxtData {
  const lines = raw.split('\n');
  const sitemapReferences: string[] = [];
  let currentAgents: string[] = [];
  let seenRuleInGroup = false;
  const agentRules: Record<string, { allow: string[]; disallow: string[] }> = {};

  for (const line of lines) {
    const trimmed = line.replace(/\s+#.*$/, '').trim();
    if (trimmed.startsWith('#') || !trimmed) continue;

    const sitemapMatch = trimmed.match(/^sitemap:\s*(.+)/i);
    if (sitemapMatch) {
      sitemapReferences.push(sitemapMatch[1].trim());
      continue;
    }

    const agentMatch = trimmed.match(/^user-agent:\s*(.+)/i);
    if (agentMatch) {
      const agent = agentMatch[1].trim().toLowerCase();
      if (seenRuleInGroup || currentAgents.length === 0) {
        currentAgents = [agent];
        seenRuleInGroup = false;
      } else {
        currentAgents.push(agent);
      }
      if (!agentRules[agent]) {
        agentRules[agent] = { allow: [], disallow: [] };
      }
      continue;
    }

    const allowMatch = trimmed.match(/^allow:\s*(.*)$/i);
    if (allowMatch) {
      seenRuleInGroup = true;
      for (const agent of currentAgents) {
        agentRules[agent]?.allow.push(allowMatch[1].trim());
      }
    }

    const disallowMatch = trimmed.match(/^disallow:\s*(.*)$/i);
    if (disallowMatch) {
      seenRuleInGroup = true;
      for (const agent of currentAgents) {
        agentRules[agent]?.disallow.push(disallowMatch[1].trim());
      }
    }
  }

  function pathMatches(rulePath: string, targetPath: string): boolean {
    if (!rulePath) return false;
    const normalizedRule = rulePath === '*' ? '/' : rulePath;
    return targetPath.startsWith(normalizedRule);
  }

  function evaluateAgent(agentName: string, targetPath: string): boolean | null {
    const rules = agentRules[agentName];
    if (!rules) return null;

    const matches = [
      ...rules.allow
        .filter((rule) => pathMatches(rule, targetPath))
        .map((rule) => ({ rule, allow: true })),
      ...rules.disallow
        .filter((rule) => pathMatches(rule, targetPath))
        .map((rule) => ({ rule, allow: false })),
    ];

    if (matches.length === 0) {
      return null;
    }

    matches.sort((a, b) => {
      if (b.rule.length !== a.rule.length) {
        return b.rule.length - a.rule.length;
      }
      return Number(b.allow) - Number(a.allow);
    });

    return matches[0].allow;
  }

  function isBotAllowed(botNames: string | string[]): boolean {
    const names = Array.isArray(botNames) ? botNames : [botNames];
    for (const name of names.map((value) => value.toLowerCase())) {
      const result = evaluateAgent(name, '/');
      if (result !== null) {
        return result;
      }
    }

    const wildcardResult = evaluateAgent('*', '/');
    if (wildcardResult !== null) {
      return wildcardResult;
    }

    return true;
  }

  return {
    exists: true,
    raw,
    allowsGPTBot: isBotAllowed('GPTBot'),
    allowsPerplexityBot: isBotAllowed('PerplexityBot'),
    allowsClaudeBot: isBotAllowed(['ClaudeBot', 'Claude-Web', 'anthropic-ai']),
    allowsGoogleBot: isBotAllowed('Googlebot'),
    allowsGoogleExtended: isBotAllowed('Google-Extended'),
    sitemapReferences,
  };
}

function requestHeaders(accept: string): HeadersInit {
  return {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: accept,
  };
}
