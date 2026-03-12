import { CrawlData, CrawledPage, RenderReadinessData, RootHttpData } from '@/types/crawler';
import { normalizeUrl, ensureProtocol, isLikelyPublicPage } from '@/lib/url-utils';
import { getBrowser } from './browser';
import { extractPageData } from './page-extractor';
import { fetchRobotsTxt } from './robots-parser';
import { fetchSitemap } from './sitemap-parser';
import { fetchLlmsTxt } from './llms-parser';
import { crawlPageWithoutBrowser } from './html-fallback';

const MAX_PAGES = 10;
const PAGE_TIMEOUT = 30000;
const TOTAL_TIMEOUT = 120000;
const CRAWL_DELAY = 1000;

export type CrawlProgressCallback = (step: string) => void;

export async function crawlSite(
  inputUrl: string,
  onProgress?: CrawlProgressCallback
): Promise<CrawlData> {
  const startTime = Date.now();
  const baseUrl = ensureProtocol(inputUrl);
  const normalized = normalizeUrl(inputUrl);
  const errors: string[] = [];

  onProgress?.('Checking robots.txt...');
  const [robotsTxt, llmsTxt, rootHttp] = await Promise.all([
    fetchRobotsTxt(baseUrl),
    fetchLlmsTxt(baseUrl),
    fetchRootHttp(baseUrl),
  ]);

  onProgress?.('Checking sitemap...');
  const sitemap = await fetchSitemap(baseUrl, robotsTxt.sitemapReferences);

  onProgress?.('Launching browser...');
  const pages: CrawledPage[] = [];
  let homepage: CrawledPage | null = null;
  let browser: Awaited<ReturnType<typeof getBrowser>> | null = null;

  try {
    browser = await getBrowser();
  } catch (err) {
    errors.push(`Browser unavailable, using HTTP fallback: ${String(err)}`);
  }

  try {
    // Crawl homepage first
    onProgress?.('Crawling homepage...');
    homepage = browser
      ? await crawlPage(browser, baseUrl, startTime)
      : await crawlPageWithoutBrowser(baseUrl, startTime);
    if (homepage) {
      pages.push(homepage);
    }

    // Discover pages from internal links + sitemap
    const discoveredUrls = discoverPages(
      baseUrl,
      homepage?.internalLinks || [],
      sitemap.urls
    );

    // Crawl additional pages
    for (const pageUrl of discoveredUrls) {
      if (pages.length >= MAX_PAGES) break;
      if (Date.now() - startTime > TOTAL_TIMEOUT) {
        errors.push('Total crawl timeout reached');
        break;
      }

      await sleep(CRAWL_DELAY);
      onProgress?.(`Crawling ${new URL(pageUrl).pathname}...`);

      try {
        const page = browser
          ? await crawlPage(browser, pageUrl, Date.now())
          : await crawlPageWithoutBrowser(pageUrl, Date.now());
        if (page) pages.push(page);
      } catch (err) {
        errors.push(`Failed to crawl ${pageUrl}: ${String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`Crawl error: ${String(err)}`);
  }

  const renderReadiness = deriveRenderReadiness(homepage, rootHttp);

  return {
    url: baseUrl,
    normalizedUrl: normalized,
    detectedPlatform: homepage?.detectedPlatform || 'custom',
    robotsTxt,
    sitemap,
    llmsTxt,
    pages,
    homepage,
    rootHttp,
    renderReadiness,
    crawledAt: Date.now(),
    durationMs: Date.now() - startTime,
    errors,
  };
}

async function crawlPage(
  browser: Awaited<ReturnType<typeof getBrowser>>,
  url: string,
  startTime: number
): Promise<CrawledPage | null> {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: PAGE_TIMEOUT,
    });
    return await extractPageData(page, url, startTime);
  } catch {
    return await crawlPageWithoutBrowser(url, startTime);
  } finally {
    await page.close();
  }
}

function discoverPages(
  baseUrl: string,
  internalLinks: string[],
  sitemapUrls: string[]
): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>([base.pathname || '/']);
  const result: string[] = [];

  // Priority: about, contact, services, blog, faq pages
  const priorityPatterns = [
    /\/about/i, /\/contact/i, /\/service/i, /\/product/i,
    /\/blog/i, /\/faq/i, /\/pricing/i, /\/team/i,
  ];

  const allPaths = [
    ...internalLinks,
    ...sitemapUrls.map((u) => {
      try { return new URL(u).pathname; } catch { return ''; }
    }),
  ].filter((path) => Boolean(path) && isCrawlablePath(path));

  // Sort: priority pages first
  const sorted = allPaths.sort((a, b) => {
    const aP = priorityPatterns.some((p) => p.test(a)) ? 0 : 1;
    const bP = priorityPatterns.some((p) => p.test(b)) ? 0 : 1;
    return aP - bP;
  });

  for (const path of sorted) {
    if (result.length >= MAX_PAGES - 1) break; // -1 for homepage
    const normalized = path.replace(/\/+$/, '') || '/';
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(new URL(normalized, baseUrl).href);
  }

  return result;
}

function isCrawlablePath(path: string): boolean {
  return isLikelyPublicPage(path);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRootHttp(url: string): Promise<RootHttpData> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    const headers = Object.fromEntries(
      Array.from(res.headers.entries()).map(([key, value]) => [key.toLowerCase(), value])
    );

    return {
      finalUrl: res.url || url,
      statusCode: res.status,
      https: (res.url || url).startsWith('https://'),
      headers,
      strictTransportSecurity: headers['strict-transport-security'],
      contentSecurityPolicy: headers['content-security-policy'],
      xFrameOptions: headers['x-frame-options'],
      xContentTypeOptions: headers['x-content-type-options'],
    };
  } catch {
    return {
      finalUrl: url,
      https: url.startsWith('https://'),
      headers: {},
    };
  }
}

function deriveRenderReadiness(
  homepage: CrawledPage | null,
  rootHttp: RootHttpData
): RenderReadinessData {
  if (!homepage) {
    return {
      mode: 'unknown',
      detail: 'Homepage content could not be inspected well enough to judge AI readability.',
    };
  }

  const hasMeaningfulServerContent = homepage.wordCount >= 120 && homepage.h1s.length > 0;
  const hasThinContent = homepage.wordCount < 60;
  const hasCanonicalSignals = Boolean(homepage.metaDescription || homepage.canonicalUrl);
  const hasStructuralSignals = homepage.h1s.length > 0 || homepage.internalLinks.length > 0;
  const cacheHint = rootHttp.headers['cache-control'] || '';
  const variesByRuntime = /(no-store|private)/i.test(cacheHint);

  if (hasMeaningfulServerContent && hasCanonicalSignals && !variesByRuntime) {
    return {
      mode: 'server-rendered',
      detail: 'The homepage returns meaningful content without relying entirely on client-side rendering.',
    };
  }

  if (hasThinContent && !hasCanonicalSignals && !hasStructuralSignals) {
    return {
      mode: 'client-heavy',
      detail: 'The homepage appears thin at first response, which can make AI crawler extraction less reliable.',
    };
  }

  return {
    mode: 'mixed',
    detail: 'The homepage is readable, but some important signals may depend on runtime rendering or incomplete head metadata.',
  };
}
