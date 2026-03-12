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
    const h1s = Array.from(document.querySelectorAll('h1')).map(
      (el) => el.textContent?.trim() || ''
    );
    const metaDesc =
      document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const metaKeywords = (
      document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
    )
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const metaGenerator =
      document.querySelector('meta[name="generator"]')?.getAttribute('content') || '';

    // OG tags
    const ogTags: Record<string, string> = {};
    document.querySelectorAll('meta[property^="og:"]').forEach((el) => {
      const prop = el.getAttribute('property') || '';
      ogTags[prop] = el.getAttribute('content') || '';
    });

    // Schema/JSON-LD
    const schemaObjects: { type: string; raw: Record<string, unknown> }[] = [];
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
        // skip invalid JSON-LD
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
      metaDescription: metaDesc,
      metaKeywords,
      ogTags,
      schemaObjects,
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
    metaDescription: data.metaDescription,
    metaKeywords: data.metaKeywords,
    ogTags: data.ogTags,
    schemaObjects: data.schemaObjects as SchemaObject[],
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
