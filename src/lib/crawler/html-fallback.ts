import { CrawledPage, SchemaObject } from '@/types/crawler';
import { classifyPage } from './page-classifier';
import { detectPlatform, extractAssetUrlsFromHtml } from '@/lib/platform-detection';

const HTML_TIMEOUT_MS = 30000;

export interface HtmlFallbackInput {
  html: string;
  url: string;
  startTime: number;
  statusCode?: number;
  lastModified?: string;
}

export async function crawlPageWithoutBrowser(
  url: string,
  startTime: number
): Promise<CrawledPage | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(HTML_TIMEOUT_MS),
    });

    if (!res.ok) {
      return null;
    }

    const html = await res.text();
    return extractFallbackPageData({
      html,
      url: res.url || url,
      startTime,
      statusCode: res.status,
      lastModified: res.headers.get('last-modified') ?? undefined,
    });
  } catch {
    return null;
  }
}

export function extractFallbackPageData({
  html,
  url,
  startTime,
  statusCode = 200,
  lastModified,
}: HtmlFallbackInput): CrawledPage {
  const title = decodeHtmlEntities(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const h1s = matchAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map((value) =>
    decodeHtmlEntities(stripTags(value)).trim()
  ).filter(Boolean);
  const metaDescription = decodeHtmlEntities(
    extractMetaContent(html, 'name', 'description') ||
      extractMetaContent(html, 'property', 'og:description')
  );
  const metaKeywords = decodeHtmlEntities(extractMetaContent(html, 'name', 'keywords'))
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const metaGenerator = decodeHtmlEntities(extractMetaContent(html, 'name', 'generator'));
  const assetUrls = extractAssetUrlsFromHtml(html);

  const ogTags: Record<string, string> = {};
  for (const tag of matchAll(html, /<meta\b[^>]*>/gi)) {
    const property = getAttribute(tag, 'property');
    if (!property?.toLowerCase().startsWith('og:')) continue;
    ogTags[property] = decodeHtmlEntities(getAttribute(tag, 'content'));
  }

  const schemaObjects: SchemaObject[] = [];
  for (const block of matchAll(
    html,
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const parsed = JSON.parse(block.trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        schemaObjects.push({
          type: String((item as Record<string, unknown>)['@type'] || 'Unknown'),
          raw: item as Record<string, unknown>,
        });
      }
    } catch {
      // Ignore malformed JSON-LD in fallback mode.
    }
  }

  const internalLinks = new Set<string>();
  const externalLinks = new Set<string>();
  const currentHost = new URL(url).hostname;

  for (const href of matchAll(html, /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi)) {
    try {
      const linkUrl = new URL(decodeHtmlEntities(href), url);
      if (linkUrl.hostname === currentHost) {
        internalLinks.add(linkUrl.pathname || '/');
      } else {
        externalLinks.add(linkUrl.href);
      }
    } catch {
      // Ignore malformed URLs in fallback mode.
    }
  }

  const textContent = decodeHtmlEntities(
    stripTags(
      html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    )
  )
    .replace(/\s+/g, ' ')
    .trim();

  const loadTimeMs = Date.now() - startTime;
  const classification = classifyPage(url, title, h1s);
  const detectedPlatform = detectPlatform({
    metaGenerator,
    assetUrls,
    html,
  });

  return {
    url,
    title,
    h1s,
    metaDescription,
    metaKeywords,
    ogTags,
    schemaObjects,
    internalLinks: [...internalLinks],
    externalLinks: [...externalLinks],
    textContent: textContent.slice(0, 10000),
    wordCount: textContent.length > 0 ? textContent.split(/\s+/).length : 0,
    lastModified,
    statusCode,
    loadTimeMs,
    classification,
    detectedPlatform,
  };
}

function matchFirst(html: string, regex: RegExp): string {
  const match = regex.exec(html);
  return match?.[1] ? stripTags(match[1]).trim() : '';
}

function matchAll(html: string, regex: RegExp): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1] || match[0]);
  }

  return matches;
}

function extractMetaContent(
  html: string,
  attrName: 'name' | 'property',
  attrValue: string
): string {
  const metaTags = matchAll(html, /<meta\b[^>]*>/gi);

  for (const tag of metaTags) {
    if (getAttribute(tag, attrName)?.toLowerCase() !== attrValue.toLowerCase()) {
      continue;
    }

    return getAttribute(tag, 'content');
  }

  return '';
}

function getAttribute(tag: string, name: string): string {
  const regex = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  return regex.exec(tag)?.[1]?.trim() || '';
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}
