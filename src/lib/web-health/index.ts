import { CrawlData, CrawledPage } from '@/types/crawler';
import { CheckVerdict, WebHealthCheckResult, WebHealthMetric, WebHealthPillarKey, WebHealthPillarScore, WebHealthSummary } from '@/types/score';

interface PageSpeedSnapshot {
  source: 'pagespeed';
  performance: number | null;
  seo: number | null;
  bestPractices: number | null;
  accessibility: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  inpMs: number | null;
  speedIndexMs: number | null;
}

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const META_MIN = 120;
const META_MAX = 160;

export async function runWebHealthEnrichment(data: CrawlData): Promise<WebHealthSummary> {
  if (!data.homepage) {
    return createUnavailableWebHealth('Homepage content was not available for Web Health scoring.');
  }

  const pageSpeed = await fetchPageSpeedSnapshot(data.url).catch(() => null);
  const performanceChecks = createPerformanceChecks(data, pageSpeed);
  const qualityChecks = createQualityChecks(data.homepage);
  const securityChecks = createSecurityChecks(data);
  const pillars = [
    buildPillar('performance', 'Performance', performanceChecks),
    buildPillar('quality', 'Website Quality', qualityChecks),
    buildPillar('security', 'Trust & Security', securityChecks),
  ];

  const pillarPercentages = pillars
    .map((pillar) => pillar.percentage)
    .filter((value): value is number => value !== null);
  const percentage = pillarPercentages.length > 0
    ? Math.round(average(pillarPercentages))
    : null;

  return {
    status: percentage === null ? 'unavailable' : 'complete',
    percentage,
    pillars,
    metrics: createMetrics(data, pageSpeed),
    updatedAt: Date.now(),
    source: pageSpeed ? 'pagespeed' : 'heuristic',
  };
}

export function createUnavailableWebHealth(error: string): WebHealthSummary {
  return {
    status: 'unavailable',
    percentage: null,
    pillars: [
      emptyPillar('performance', 'Performance'),
      emptyPillar('quality', 'Website Quality'),
      emptyPillar('security', 'Trust & Security'),
    ],
    metrics: [],
    updatedAt: Date.now(),
    error,
  };
}

function createPerformanceChecks(
  data: CrawlData,
  pageSpeed: PageSpeedSnapshot | null
): WebHealthCheckResult[] {
  const homepage = data.homepage;
  if (pageSpeed) {
    const categoryChecks: WebHealthCheckResult[] = [
      createCheck({
        id: 'whp-performance-score',
        pillar: 'performance',
        label: 'PageSpeed performance score',
        verdict: metricVerdict(pageSpeed.performance, 80),
        points: pointsFromVerdict(metricVerdict(pageSpeed.performance, 80), 8),
        maxPoints: 8,
        detail:
          pageSpeed.performance === null
            ? 'PageSpeed performance score was unavailable.'
            : `PageSpeed performance is ${pageSpeed.performance}/100.`,
      }),
      createCheck({
        id: 'whp-seo-score',
        pillar: 'performance',
        label: 'PageSpeed SEO score',
        verdict: metricVerdict(pageSpeed.seo, 80),
        points: pointsFromVerdict(metricVerdict(pageSpeed.seo, 80), 4),
        maxPoints: 4,
        detail: pageSpeed.seo === null ? 'PageSpeed SEO score was unavailable.' : `PageSpeed SEO is ${pageSpeed.seo}/100.`,
      }),
      createCheck({
        id: 'whp-best-practices-score',
        pillar: 'performance',
        label: 'PageSpeed best practices score',
        verdict: metricVerdict(pageSpeed.bestPractices, 80),
        points: pointsFromVerdict(metricVerdict(pageSpeed.bestPractices, 80), 4),
        maxPoints: 4,
        detail: pageSpeed.bestPractices === null ? 'Best practices score was unavailable.' : `Best practices score is ${pageSpeed.bestPractices}/100.`,
      }),
      createCheck({
        id: 'whp-accessibility-score',
        pillar: 'performance',
        label: 'PageSpeed accessibility score',
        verdict: metricVerdict(pageSpeed.accessibility, 80),
        points: pointsFromVerdict(metricVerdict(pageSpeed.accessibility, 80), 4),
        maxPoints: 4,
        detail: pageSpeed.accessibility === null ? 'Accessibility score was unavailable.' : `Accessibility score is ${pageSpeed.accessibility}/100.`,
      }),
    ];

    return [
      ...categoryChecks,
      createCheck({
        id: 'whp-lcp',
        pillar: 'performance',
        label: 'Largest Contentful Paint',
        verdict: pageSpeed.lcpMs !== null && pageSpeed.lcpMs <= 2500 ? 'pass' : 'fail',
        points: pageSpeed.lcpMs !== null && pageSpeed.lcpMs <= 2500 ? 8 : 0,
        maxPoints: 8,
        detail:
          pageSpeed.lcpMs === null
            ? 'LCP was unavailable from PageSpeed.'
            : `Largest Contentful Paint is ${Math.round(pageSpeed.lcpMs)}ms.`,
      }),
      createCheck({
        id: 'whp-cls',
        pillar: 'performance',
        label: 'Cumulative Layout Shift',
        verdict: pageSpeed.cls !== null && pageSpeed.cls <= 0.1 ? 'pass' : 'fail',
        points: pageSpeed.cls !== null && pageSpeed.cls <= 0.1 ? 4 : 0,
        maxPoints: 4,
        detail:
          pageSpeed.cls === null
            ? 'CLS was unavailable from PageSpeed.'
            : `Cumulative Layout Shift is ${pageSpeed.cls.toFixed(2)}.`,
      }),
      createCheck({
        id: 'whp-tbt',
        pillar: 'performance',
        label: 'Total Blocking Time',
        verdict: pageSpeed.tbtMs !== null && pageSpeed.tbtMs <= 200 ? 'pass' : 'fail',
        points: pageSpeed.tbtMs !== null && pageSpeed.tbtMs <= 200 ? 4 : 0,
        maxPoints: 4,
        detail:
          pageSpeed.tbtMs === null
            ? 'Total Blocking Time was unavailable from PageSpeed.'
            : `Total Blocking Time is ${Math.round(pageSpeed.tbtMs)}ms.`,
      }),
      createCheck({
        id: 'whp-inp',
        pillar: 'performance',
        label: 'Interaction to Next Paint',
        verdict: pageSpeed.inpMs !== null && pageSpeed.inpMs <= 200 ? 'pass' : 'fail',
        points: pageSpeed.inpMs !== null && pageSpeed.inpMs <= 200 ? 4 : 0,
        maxPoints: 4,
        detail:
          pageSpeed.inpMs === null
            ? 'INP was unavailable from PageSpeed.'
            : `Interaction to Next Paint is ${Math.round(pageSpeed.inpMs)}ms.`,
      }),
    ];
  }

  if (!homepage) {
    return [];
  }

  const homepageLoadPass = homepage.loadTimeMs <= 2500;
  const avgLoad = average(data.pages.map((page) => page.loadTimeMs));
  const averageLoadPass = avgLoad <= 3000;
  const renderPass = data.renderReadiness.mode !== 'client-heavy';

  return [
    createCheck({
      id: 'whp-homepage-load',
      pillar: 'performance',
      label: 'Homepage response speed',
      verdict: homepageLoadPass ? 'pass' : 'fail',
      points: homepageLoadPass ? 12 : 0,
      maxPoints: 12,
      detail: `Homepage loaded in ${homepage.loadTimeMs}ms during crawl.`,
    }),
    createCheck({
      id: 'whp-average-load',
      pillar: 'performance',
      label: 'Average page load speed',
      verdict: averageLoadPass ? 'pass' : 'fail',
      points: averageLoadPass ? 8 : 0,
      maxPoints: 8,
      detail: `Average page load time was ${Math.round(avgLoad)}ms across ${data.pages.length} pages.`,
    }),
    createCheck({
      id: 'whp-render-mode',
      pillar: 'performance',
      label: 'Server-readable rendering',
      verdict: renderPass ? 'pass' : 'fail',
      points: renderPass ? 4 : 0,
      maxPoints: 4,
      detail: data.renderReadiness.detail,
    }),
  ];
}

function createQualityChecks(homepage: CrawledPage): WebHealthCheckResult[] {
  const titleLength = homepage.title.trim().length;
  const metaLength = homepage.metaDescription.trim().length;
  const headingHierarchyValid = hasValidHeadingHierarchy(homepage.headings);
  const ogRequired = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
  const twitterRequired = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
  const hasOgBundle = ogRequired.every((key) => Boolean(homepage.ogTags[key]));
  const hasTwitterBundle = twitterRequired.every((key) => Boolean(homepage.twitterTags[key]));
  const hasSchema = homepage.schemaObjects.length > 0 && homepage.schemaParseErrors === 0;

  return [
    createCheck({
      id: 'whq-title',
      pillar: 'quality',
      label: 'Title tag length',
      verdict: titleLength >= TITLE_MIN && titleLength <= TITLE_MAX ? 'pass' : 'fail',
      points: titleLength >= TITLE_MIN && titleLength <= TITLE_MAX ? 10 : 0,
      maxPoints: 10,
      detail: `Homepage title is ${titleLength} characters long.`,
    }),
    createCheck({
      id: 'whq-meta-description',
      pillar: 'quality',
      label: 'Meta description length',
      verdict: metaLength >= META_MIN && metaLength <= META_MAX ? 'pass' : 'fail',
      points: metaLength >= META_MIN && metaLength <= META_MAX ? 8 : 0,
      maxPoints: 8,
      detail: metaLength > 0
        ? `Homepage meta description is ${metaLength} characters long.`
        : 'Homepage meta description is missing.',
    }),
    createCheck({
      id: 'whq-favicon',
      pillar: 'quality',
      label: 'Favicon present',
      verdict: homepage.hasFavicon ? 'pass' : 'fail',
      points: homepage.hasFavicon ? 3 : 0,
      maxPoints: 3,
      detail: homepage.hasFavicon
        ? 'A favicon link was found in the homepage head.'
        : 'No favicon link was detected on the homepage.',
    }),
    createCheck({
      id: 'whq-viewport',
      pillar: 'quality',
      label: 'Viewport meta configured',
      verdict: hasResponsiveViewport(homepage.viewport) ? 'pass' : 'fail',
      points: hasResponsiveViewport(homepage.viewport) ? 5 : 0,
      maxPoints: 5,
      detail: homepage.viewport
        ? `Viewport is set to "${homepage.viewport}".`
        : 'Viewport meta tag is missing.',
    }),
    createCheck({
      id: 'whq-headings',
      pillar: 'quality',
      label: 'Heading hierarchy',
      verdict: headingHierarchyValid ? 'pass' : 'fail',
      points: headingHierarchyValid ? 6 : 0,
      maxPoints: 6,
      detail: headingHierarchyValid
        ? `Heading structure looks sound across ${homepage.headings.length} headings.`
        : 'Heading levels are missing, repeated without an H1, or skip levels unexpectedly.',
    }),
    createCheck({
      id: 'whq-canonical',
      pillar: 'quality',
      label: 'Canonical URL',
      verdict: Boolean(homepage.canonicalUrl) ? 'pass' : 'fail',
      points: homepage.canonicalUrl ? 6 : 0,
      maxPoints: 6,
      detail: homepage.canonicalUrl
        ? `Canonical URL points to ${homepage.canonicalUrl}.`
        : 'Canonical URL is missing from the homepage.',
    }),
    createCheck({
      id: 'whq-lang',
      pillar: 'quality',
      label: 'HTML lang attribute',
      verdict: Boolean(homepage.lang) ? 'pass' : 'fail',
      points: homepage.lang ? 3 : 0,
      maxPoints: 3,
      detail: homepage.lang
        ? `HTML lang is set to ${homepage.lang}.`
        : 'HTML lang attribute is missing.',
    }),
    createCheck({
      id: 'whq-charset',
      pillar: 'quality',
      label: 'Character encoding',
      verdict: /utf-?8/i.test(homepage.charset || '') ? 'pass' : 'fail',
      points: /utf-?8/i.test(homepage.charset || '') ? 3 : 0,
      maxPoints: 3,
      detail: homepage.charset
        ? `Character encoding is ${homepage.charset}.`
        : 'Character encoding was not detected.',
    }),
    createCheck({
      id: 'whq-open-graph',
      pillar: 'quality',
      label: 'Open Graph coverage',
      verdict: hasOgBundle ? 'pass' : 'fail',
      points: hasOgBundle ? 9 : 0,
      maxPoints: 9,
      detail: hasOgBundle
        ? 'All core Open Graph tags were found.'
        : `Missing one or more Open Graph tags: ${missingKeys(ogRequired, homepage.ogTags).join(', ') || 'none'}.`,
    }),
    createCheck({
      id: 'whq-twitter',
      pillar: 'quality',
      label: 'Twitter card coverage',
      verdict: hasTwitterBundle ? 'pass' : 'fail',
      points: hasTwitterBundle ? 4 : 0,
      maxPoints: 4,
      detail: hasTwitterBundle
        ? 'All core Twitter card tags were found.'
        : `Missing one or more Twitter tags: ${missingKeys(twitterRequired, homepage.twitterTags).join(', ') || 'none'}.`,
    }),
    createCheck({
      id: 'whq-schema-detail',
      pillar: 'quality',
      label: 'Structured data is parseable',
      verdict: hasSchema ? 'pass' : 'fail',
      points: hasSchema ? 6 : 0,
      maxPoints: 6,
      detail: hasSchema
        ? `Detected ${homepage.schemaObjects.length} parseable JSON-LD block(s).`
        : homepage.schemaParseErrors > 0
          ? `Detected ${homepage.schemaParseErrors} malformed JSON-LD block(s).`
          : 'No structured data blocks were detected on the homepage.',
    }),
  ];
}

function createSecurityChecks(data: CrawlData): WebHealthCheckResult[] {
  const headers = data.rootHttp;
  const hasStrongHsts = /max-age=/i.test(headers.strictTransportSecurity || '');
  const hasCsp = Boolean(headers.contentSecurityPolicy);
  const hasXfo = /sameorigin|deny/i.test(headers.xFrameOptions || '');
  const hasNosniff = /nosniff/i.test(headers.xContentTypeOptions || '');

  return [
    createCheck({
      id: 'whs-https',
      pillar: 'security',
      label: 'HTTPS enabled',
      verdict: headers.https ? 'pass' : 'fail',
      points: headers.https ? 10 : 0,
      maxPoints: 10,
      detail: headers.https
        ? `The root URL resolved over HTTPS (${headers.finalUrl}).`
        : 'The site did not resolve over HTTPS.',
    }),
    createCheck({
      id: 'whs-hsts',
      pillar: 'security',
      label: 'Strict-Transport-Security',
      verdict: hasStrongHsts ? 'pass' : 'fail',
      points: hasStrongHsts ? 6 : 0,
      maxPoints: 6,
      detail: headers.strictTransportSecurity
        ? `HSTS header is present: ${headers.strictTransportSecurity}.`
        : 'Strict-Transport-Security header is missing.',
    }),
    createCheck({
      id: 'whs-csp',
      pillar: 'security',
      label: 'Content-Security-Policy',
      verdict: hasCsp ? 'pass' : 'fail',
      points: hasCsp ? 6 : 0,
      maxPoints: 6,
      detail: hasCsp
        ? 'Content-Security-Policy header is present.'
        : 'Content-Security-Policy header is missing.',
    }),
    createCheck({
      id: 'whs-xfo',
      pillar: 'security',
      label: 'X-Frame-Options',
      verdict: hasXfo ? 'pass' : 'fail',
      points: hasXfo ? 4 : 0,
      maxPoints: 4,
      detail: headers.xFrameOptions
        ? `X-Frame-Options is ${headers.xFrameOptions}.`
        : 'X-Frame-Options header is missing.',
    }),
    createCheck({
      id: 'whs-nosniff',
      pillar: 'security',
      label: 'X-Content-Type-Options',
      verdict: hasNosniff ? 'pass' : 'fail',
      points: hasNosniff ? 4 : 0,
      maxPoints: 4,
      detail: headers.xContentTypeOptions
        ? `X-Content-Type-Options is ${headers.xContentTypeOptions}.`
        : 'X-Content-Type-Options header is missing.',
    }),
  ];
}

function createMetrics(data: CrawlData, pageSpeed: PageSpeedSnapshot | null): WebHealthMetric[] {
  const homepage = data.homepage;
  const metrics: WebHealthMetric[] = [
    {
      key: 'render-mode',
      label: 'Render mode',
      value: null,
      displayValue: labelizeRenderMode(data.renderReadiness.mode),
      status: data.renderReadiness.mode === 'client-heavy' ? 'warn' : 'ok',
      detail: data.renderReadiness.detail,
    },
  ];

  if (homepage) {
    metrics.push(
      {
        key: 'homepage-load',
        label: 'Homepage load',
        value: homepage.loadTimeMs,
        displayValue: `${homepage.loadTimeMs}ms`,
        status: homepage.loadTimeMs <= 2500 ? 'ok' : 'warn',
        detail: 'Observed during the crawl session.',
      },
      {
        key: 'schema-blocks',
        label: 'Schema blocks',
        value: homepage.schemaObjects.length,
        displayValue: String(homepage.schemaObjects.length),
        status: homepage.schemaObjects.length > 0 && homepage.schemaParseErrors === 0 ? 'ok' : 'warn',
        detail: homepage.schemaParseErrors > 0
          ? `${homepage.schemaParseErrors} malformed JSON-LD block(s) were skipped.`
          : 'Homepage JSON-LD blocks detected.',
      },
      {
        key: 'title-length',
        label: 'Title length',
        value: homepage.title.length,
        displayValue: `${homepage.title.length} chars`,
        status: homepage.title.length >= TITLE_MIN && homepage.title.length <= TITLE_MAX ? 'ok' : 'warn',
        detail: 'Ideal title length is roughly 30 to 60 characters.',
      }
    );
  }

  if (pageSpeed) {
    metrics.unshift(
      {
        key: 'pagespeed-performance',
        label: 'PageSpeed score',
        value: pageSpeed.performance,
        displayValue: pageSpeed.performance === null ? 'Unavailable' : `${pageSpeed.performance}/100`,
        status: pageSpeed.performance !== null && pageSpeed.performance >= 80 ? 'ok' : 'warn',
        detail: 'Live PageSpeed Insights data when an API key is configured.',
      },
      {
        key: 'largest-contentful-paint',
        label: 'LCP',
        value: pageSpeed.lcpMs,
        displayValue: pageSpeed.lcpMs === null ? 'Unavailable' : `${Math.round(pageSpeed.lcpMs)}ms`,
        status: pageSpeed.lcpMs !== null && pageSpeed.lcpMs <= 2500 ? 'ok' : 'warn',
        detail: 'Largest Contentful Paint from Lighthouse.',
      },
      {
        key: 'pagespeed-seo',
        label: 'SEO score',
        value: pageSpeed.seo,
        displayValue: pageSpeed.seo === null ? 'Unavailable' : `${pageSpeed.seo}/100`,
        status: pageSpeed.seo !== null && pageSpeed.seo >= 80 ? 'ok' : 'warn',
        detail: 'Lighthouse SEO category score.',
      }
    );
  }

  return metrics;
}

function buildPillar(
  key: WebHealthPillarKey,
  label: string,
  checks: WebHealthCheckResult[]
): WebHealthPillarScore {
  const maxScore = checks.reduce((sum, check) => sum + check.maxPoints, 0);
  const score = checks.reduce((sum, check) => sum + check.points, 0);

  return {
    key,
    label,
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : null,
    status: maxScore > 0 ? 'complete' : 'unavailable',
    checks,
  };
}

function emptyPillar(key: WebHealthPillarKey, label: string): WebHealthPillarScore {
  return {
    key,
    label,
    score: 0,
    maxScore: 0,
    percentage: null,
    status: 'unavailable',
    checks: [],
  };
}

function createCheck(input: Omit<WebHealthCheckResult, 'category'>): WebHealthCheckResult {
  return {
    ...input,
    category: 'web',
  };
}

function hasResponsiveViewport(viewport?: string): boolean {
  if (!viewport) return false;
  const value = viewport.toLowerCase();
  return value.includes('width=device-width') && value.includes('initial-scale=1');
}

function hasValidHeadingHierarchy(headings: CrawledPage['headings']): boolean {
  if (headings.length === 0) return false;
  if (!headings.some((heading) => heading.level === 1)) return false;

  let previousLevel = headings[0].level;
  for (const heading of headings.slice(1)) {
    if (heading.level - previousLevel > 1) {
      return false;
    }
    previousLevel = heading.level;
  }

  return true;
}

function missingKeys(required: string[], record: Record<string, string>): string[] {
  return required.filter((key) => !record[key]);
}

function labelizeRenderMode(mode: CrawlData['renderReadiness']['mode']): string {
  if (mode === 'server-rendered') return 'Server rendered';
  if (mode === 'client-heavy') return 'Client heavy';
  if (mode === 'mixed') return 'Mixed';
  return 'Unknown';
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function metricVerdict(value: number | null, min: number): CheckVerdict {
  return value !== null && value >= min ? 'pass' : 'fail';
}

function pointsFromVerdict(verdict: CheckVerdict, maxPoints: number): number {
  return verdict === 'pass' ? maxPoints : 0;
}

async function fetchPageSpeedSnapshot(url: string): Promise<PageSpeedSnapshot | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) return null;

  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.set('key', apiKey);
  endpoint.searchParams.set('category', 'performance');
  endpoint.searchParams.append('category', 'seo');
  endpoint.searchParams.append('category', 'best-practices');
  endpoint.searchParams.append('category', 'accessibility');

  const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`PageSpeed request failed with ${res.status}`);
  }

  const payload = await res.json();
  const categories = payload?.lighthouseResult?.categories || {};
  const audits = payload?.lighthouseResult?.audits || {};

  return {
    source: 'pagespeed',
    performance: normalizeCategoryScore(categories.performance?.score),
    seo: normalizeCategoryScore(categories.seo?.score),
    bestPractices: normalizeCategoryScore(categories['best-practices']?.score),
    accessibility: normalizeCategoryScore(categories.accessibility?.score),
    lcpMs: normalizeNumeric(audits['largest-contentful-paint']?.numericValue),
    cls: normalizeNumeric(audits['cumulative-layout-shift']?.numericValue),
    tbtMs: normalizeNumeric(audits['total-blocking-time']?.numericValue),
    inpMs: normalizeNumeric(audits['interaction-to-next-paint']?.numericValue),
    speedIndexMs: normalizeNumeric(audits['speed-index']?.numericValue),
  };
}

function normalizeCategoryScore(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  return Math.round(value * 100);
}

function normalizeNumeric(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}
