import { CrawlData } from '@/types/crawler';

export function generateRobotsTxt(data: CrawlData): string {
  const existing = data.robotsTxt.raw;
  const sitemapUrl = data.sitemap.exists
    ? new URL('/sitemap.xml', data.url).href
    : null;

  const aiDirectives = `
# AI Search Bot Directives (added by airadr)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Bytespider
Allow: /
`.trim();

  let result: string;

  if (existing) {
    // Append AI directives to existing robots.txt
    result = existing.trimEnd() + '\n\n' + aiDirectives;
  } else {
    // Create new robots.txt
    result = `User-agent: *
Allow: /

${aiDirectives}`;
  }

  // Add sitemap reference if not present
  if (sitemapUrl && !result.toLowerCase().includes('sitemap:')) {
    result += `\n\nSitemap: ${sitemapUrl}`;
  }

  return result + '\n';
}
