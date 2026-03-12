import type { Page } from 'puppeteer';
import { CrawledPage, SchemaObject } from '@/types/crawler';
import { classifyPage } from './page-classifier';
import { detectPlatform } from '@/lib/platform-detection';

export async function extractPageData(
  page: Page,
  url: string,
  startTime: number
): Promise<CrawledPage> {
  const data = await page.evaluate(() => {
    const title = document.title || '';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(
      (el) => ({
        level: Number(el.tagName.replace('H', '')),
        text: el.textContent?.trim() || '',
      })
    ).filter((heading) => heading.text.length > 0);
    const h1s = headings.filter((heading) => heading.level === 1).map((heading) => heading.text);
    const metaDesc =
      document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const metaKeywords = (
      document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
    )
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const canonicalUrl =
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined;
    const viewport =
      document.querySelector('meta[name="viewport"]')?.getAttribute('content') || undefined;
    const hasFavicon =
      document.querySelector('link[rel*="icon"]') !== null ||
      Array.from(document.querySelectorAll('link[rel]')).some((el) =>
        (el.getAttribute('rel') || '').toLowerCase().includes('icon')
      );
    const lang = document.documentElement.getAttribute('lang') || undefined;
    const charset =
      document.querySelector('meta[charset]')?.getAttribute('charset') ||
      document.characterSet ||
      undefined;
    const metaGenerator =
      document.querySelector('meta[name="generator"]')?.getAttribute('content') || '';

    // OG tags
    const ogTags: Record<string, string> = {};
    document.querySelectorAll('meta[property^="og:"]').forEach((el) => {
      const prop = el.getAttribute('property') || '';
      ogTags[prop] = el.getAttribute('content') || '';
    });

    const twitterTags: Record<string, string> = {};
    document.querySelectorAll('meta[name^="twitter:"]').forEach((el) => {
      const name = el.getAttribute('name') || '';
      twitterTags[name] = el.getAttribute('content') || '';
    });

    // Schema/JSON-LD
    const schemaObjects: { type: string; raw: Record<string, unknown> }[] = [];
    let schemaParseErrors = 0;
    document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
      try {
        const parsed = JSON.parse(el.textContent || '');
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          schemaObjects.push({
            type: item['@type'] || 'Unknown',
            raw: item,
          });
        }
      } catch {
        schemaParseErrors += 1;
      }
    });

    // Links
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];
    const currentHost = window.location.hostname;
    document.querySelectorAll('a[href]').forEach((a) => {
      try {
        const href = (a as HTMLAnchorElement).href;
        const linkUrl = new URL(href);
        if (linkUrl.hostname === currentHost) {
          internalLinks.push(linkUrl.pathname);
        } else {
          externalLinks.push(href);
        }
      } catch {
        // skip invalid URLs
      }
    });

    const assetUrls = Array.from(
      document.querySelectorAll('script[src], link[href], img[src]')
    ).map((el) => {
      if (el instanceof HTMLScriptElement || el instanceof HTMLImageElement) {
        return el.src;
      }

      if (el instanceof HTMLLinkElement) {
        return el.href;
      }

      return '';
    }).filter(Boolean);

    // Text content
    const bodyText = document.body?.innerText || '';
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    return {
      title,
      h1s,
      headings,
      metaDescription: metaDesc,
      metaKeywords,
      ogTags,
      twitterTags,
      canonicalUrl,
      viewport,
      hasFavicon,
      lang,
      charset,
      schemaObjects,
      schemaParseErrors,
      internalLinks: [...new Set(internalLinks)],
      externalLinks: [...new Set(externalLinks)],
      metaGenerator,
      assetUrls,
      textContent: bodyText.slice(0, 10000), // limit stored text
      wordCount,
    };
  });

  const loadTimeMs = Date.now() - startTime;
  const classification = classifyPage(url, data.title, data.h1s);
  const detectedPlatform = detectPlatform({
    metaGenerator: data.metaGenerator,
    assetUrls: data.assetUrls,
  });

  return {
    url,
    title: data.title,
    h1s: data.h1s,
    headings: data.headings,
    metaDescription: data.metaDescription,
    metaKeywords: data.metaKeywords,
    ogTags: data.ogTags,
    twitterTags: data.twitterTags,
    canonicalUrl: data.canonicalUrl,
    viewport: data.viewport,
    hasFavicon: data.hasFavicon,
    lang: data.lang,
    charset: data.charset,
    schemaObjects: data.schemaObjects as SchemaObject[],
    schemaParseErrors: data.schemaParseErrors,
    internalLinks: data.internalLinks,
    externalLinks: data.externalLinks,
    textContent: data.textContent,
    wordCount: data.wordCount,
    lastModified: undefined,
    statusCode: 200,
    loadTimeMs,
    classification,
    detectedPlatform,
  };
}
