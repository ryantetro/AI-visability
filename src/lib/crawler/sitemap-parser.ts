import { SitemapData } from '@/types/crawler';

const SITEMAP_TIMEOUT_MS = 10000;
const MAX_SITEMAPS = 10;
const MAX_URLS = 500;

export async function fetchSitemap(
  baseUrl: string,
  robotsSitemapRefs: string[]
): Promise<SitemapData> {
  // Try robots.txt references first, then default path
  const urlsToTry = [
    ...robotsSitemapRefs,
    new URL('/sitemap.xml', baseUrl).href,
  ];
  const tried = new Set<string>();

  for (const sitemapUrl of urlsToTry) {
    if (tried.has(sitemapUrl)) continue;
    tried.add(sitemapUrl);

    try {
      const urls = await resolveSitemapUrls(sitemapUrl, tried, 0);
      if (urls.length === 0) continue;

      return {
        exists: true,
        urls: urls.slice(0, MAX_URLS),
        urlCount: urls.length,
        referencedInRobots: robotsSitemapRefs.length > 0,
      };
    } catch {
      continue;
    }
  }

  return {
    exists: false,
    urls: [],
    urlCount: 0,
    referencedInRobots: robotsSitemapRefs.length > 0,
  };
}

async function resolveSitemapUrls(
  sitemapUrl: string,
  visited: Set<string>,
  depth: number
): Promise<string[]> {
  if (depth > 2 || visited.size > MAX_SITEMAPS) {
    return [];
  }

  const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(SITEMAP_TIMEOUT_MS) });
  if (!res.ok) {
    return [];
  }

  const text = await res.text();
  if (text.includes('<urlset')) {
    return parseSitemapLocs(text);
  }

  if (!text.includes('<sitemapindex')) {
    return [];
  }

  const childSitemaps = parseSitemapLocs(text).slice(0, MAX_SITEMAPS);
  const nestedResults: string[] = [];

  for (const childSitemap of childSitemaps) {
    if (visited.has(childSitemap)) continue;
    visited.add(childSitemap);
    nestedResults.push(...(await resolveSitemapUrls(childSitemap, visited, depth + 1)));
    if (nestedResults.length >= MAX_URLS) {
      break;
    }
  }

  return [...new Set(nestedResults)];
}

function parseSitemapLocs(xml: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}
