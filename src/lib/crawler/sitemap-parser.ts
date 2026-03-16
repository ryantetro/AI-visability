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
      const result = await resolveSitemapUrls(sitemapUrl, tried, 0);
      if (result.urls.length === 0) {
        if (result.accessStatus === 'blocked') {
          return {
            exists: false,
            urls: [],
            urlCount: 0,
            referencedInRobots: robotsSitemapRefs.length > 0,
            accessStatus: 'blocked',
            format: result.format,
            sourceUrl: sitemapUrl,
          };
        }
        continue;
      }

      return {
        exists: true,
        urls: result.urls.slice(0, MAX_URLS),
        urlCount: result.urls.length,
        referencedInRobots: robotsSitemapRefs.length > 0,
        accessStatus: 'ok',
        format: result.format,
        sourceUrl: sitemapUrl,
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
    accessStatus: 'missing',
    format: 'unknown',
  };
}

async function resolveSitemapUrls(
  sitemapUrl: string,
  visited: Set<string>,
  depth: number
): Promise<{ urls: string[]; accessStatus: 'ok' | 'blocked' | 'missing'; format: SitemapData['format'] }> {
  if (depth > 2 || visited.size > MAX_SITEMAPS) {
    return { urls: [], accessStatus: 'missing', format: 'unknown' };
  }

  const res = await fetch(sitemapUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/xml,text/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(SITEMAP_TIMEOUT_MS),
  });
  if (!res.ok) {
    return {
      urls: [],
      accessStatus: isBlockedStatus(res.status) ? 'blocked' : 'missing',
      format: 'unknown',
    };
  }

  const text = await res.text();
  const xmlType = parseXmlSitemap(text);
  if (xmlType) {
    if (xmlType.kind === 'urlset') {
      return { urls: xmlType.urls, accessStatus: 'ok', format: 'xml' };
    }

    const nestedResults: string[] = [];
    for (const childSitemap of xmlType.urls.slice(0, MAX_SITEMAPS)) {
      if (visited.has(childSitemap)) continue;
      visited.add(childSitemap);
      const child = await resolveSitemapUrls(childSitemap, visited, depth + 1);
      nestedResults.push(...child.urls);
      if (nestedResults.length >= MAX_URLS) {
        break;
      }
    }

    return { urls: [...new Set(nestedResults)], accessStatus: 'ok', format: 'xml' };
  }

  const jsonUrls = parseJsonSitemap(text);
  if (jsonUrls.length > 0) {
    return { urls: jsonUrls, accessStatus: 'ok', format: 'json' };
  }

  const textUrls = parsePlainTextSitemap(text);
  if (textUrls.length > 0) {
    return { urls: textUrls, accessStatus: 'ok', format: 'text' };
  }

  return { urls: [], accessStatus: 'missing', format: 'unknown' };
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

function parseXmlSitemap(xml: string): { kind: 'urlset' | 'sitemapindex'; urls: string[] } | null {
  if (xml.includes('<urlset')) {
    return { kind: 'urlset', urls: parseSitemapLocs(xml) };
  }

  if (xml.includes('<sitemapindex')) {
    return { kind: 'sitemapindex', urls: parseSitemapLocs(xml) };
  }

  return null;
}

function parseJsonSitemap(text: string): string[] {
  try {
    const parsed = JSON.parse(text);
    return collectUrlStrings(parsed).slice(0, MAX_URLS);
  } catch {
    return [];
  }
}

function collectUrlStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return /^https?:\/\//i.test(value) ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectUrlStrings(item));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.values(value as Record<string, unknown>).flatMap((item) => collectUrlStrings(item));
}

function parsePlainTextSitemap(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line))
    .slice(0, MAX_URLS);
}

function isBlockedStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429;
}
