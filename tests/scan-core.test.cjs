require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const { strFromU8, unzipSync } = require('fflate');
const { NextRequest } = require('next/server');

const { fetchRobotsTxt } = require('../src/lib/crawler/robots-parser.ts');
const { fetchSitemap } = require('../src/lib/crawler/sitemap-parser.ts');
const { fetchLlmsTxt } = require('../src/lib/crawler/llms-parser.ts');
const {
  crawlPageWithoutBrowser,
  extractFallbackPageData,
} = require('../src/lib/crawler/html-fallback.ts');
const { detectPlatform } = require('../src/lib/platform-detection.ts');
const { scoreCrawlData } = require('../src/lib/scorer/index.ts');
const { runWebHealthEnrichment } = require('../src/lib/web-health/index.ts');
const { generateAllFiles } = require('../src/lib/generator/index.ts');
const { createGeneratedFilesArchive } = require('../src/lib/files-archive.ts');
const { estimateRemainingSeconds } = require('../src/lib/scan-eta.ts');
const { initialProgress, startScan } = require('../src/lib/scan-workflow.ts');
const { getPublicScoreSummary } = require('../src/lib/public-score.ts');
const { resetMockDb, mockDb } = require('../src/lib/services/mock-db.ts');
const { resetScanRateLimitStore } = require('../src/lib/scan-rate-limit.ts');
const {
  startDomainVerification,
  confirmDomainVerification,
  listLeaderboardEntries,
  listLeaderboardEntriesFiltered,
} = require('../src/lib/public-proof.ts');
const {
  addMonitoringDomain,
  removeMonitoringDomain,
  listMonitoringDomains,
  updateMonitoringDomain,
  resetMonitoringStore,
} = require('../src/lib/monitoring.ts');
const {
  buildOpportunityAlertSummary,
  hasOpportunityAlertCooldownElapsed,
  OPPORTUNITY_ALERT_COOLDOWN_MS,
} = require('../src/lib/opportunity-alerts.ts');
const { mockAlertService } = require('../src/lib/monitoring-alerts.ts');
const { mockCrawlerVisits, resetMockCrawlerVisits } = require('../src/lib/services/mock-crawler-visits.ts');
const { mockReferralVisits, resetMockReferralVisits } = require('../src/lib/services/mock-referral-visits.ts');
const archiveRoute = require('../src/app/api/scan/[id]/files/archive/route.ts');
const reportRoute = require('../src/app/api/scan/[id]/report/route.ts');
const monitoringDomainRoute = require('../src/app/api/monitoring/[domain]/route.ts');
const opportunityAlertRoute = require('../src/app/api/opportunity-alert/route.ts');
const cronMonitorRoute = require('../src/app/api/cron/monitor/route.ts');
const publicScorePage = require('../src/app/score/[id]/page.tsx');
const {
  AUTH_COOKIE_NAME,
  _setTestAuth,
  _clearTestAuth,
} = require('../src/lib/auth.ts');

const DAY_MS = 24 * 60 * 60 * 1000;

test.beforeEach(() => {
  resetMockDb();
  resetScanRateLimitStore();
  resetMonitoringStore();
  resetMockCrawlerVisits();
  resetMockReferralVisits();
  _clearTestAuth();
});

function withMockFetch(implementation, run) {
  const originalFetch = global.fetch;
  global.fetch = implementation;

  return Promise.resolve()
    .then(run)
    .finally(() => {
      global.fetch = originalFetch;
    });
}

function createAuthedRequest(url, email = 'owner@example.com') {
  const user = { id: `test-${email}`, email, name: 'Test User', provider: 'email' };
  const token = `test-token-${email}`;
  _setTestAuth(token, user);
  return new NextRequest(url, {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
    },
  });
}

function createAuthedJsonRequest(url, method, body, email = 'owner@example.com') {
  const user = { id: `test-${email}`, email, name: 'Test User', provider: 'email' };
  const token = `test-token-${email}`;
  _setTestAuth(token, user);
  return new NextRequest(url, {
    method,
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function seedOpportunityTraffic(domain = 'example.com') {
  const pages = [
    ['/pricing', 12],
    ['/blog/ai-visibility', 8],
    ['/compare', 5],
  ];

  for (const [path, count] of pages) {
    for (let index = 0; index < count; index += 1) {
      await mockCrawlerVisits.logVisit({
        domain,
        botName: index % 2 === 0 ? 'ClaudeBot' : 'GPTBot',
        botCategory: 'citation',
        pagePath: path,
        userAgent: 'test-bot',
        responseCode: 200,
      });
    }
  }

  await mockReferralVisits.logVisit({
    domain,
    sourceEngine: 'chatgpt',
    referrerUrl: 'https://chat.openai.com',
    landingPage: '/pricing',
    userAgent: 'test-browser',
  });
}

function createCrawlData(overrides = {}) {
  const detectedPlatform = overrides.detectedPlatform || 'custom';
  const homepage = {
    url: 'https://example.com/',
    title: 'Example Co | AI Search',
    h1s: ['Example Co'],
    headings: [
      { level: 1, text: 'Example Co' },
      { level: 2, text: 'AI visibility audits' },
      { level: 2, text: 'Structured data fixes' },
    ],
    metaDescription:
      'Example Co helps businesses improve AI visibility with clear structured content.',
    metaKeywords: ['ai visibility', 'llms.txt'],
    ogTags: {
      'og:title': 'Example Co',
      'og:description': 'AI visibility audits for small businesses.',
      'og:image': 'https://example.com/logo.png',
      'og:url': 'https://example.com/',
      'og:type': 'website',
    },
    twitterTags: {
      'twitter:card': 'summary_large_image',
      'twitter:title': 'Example Co',
      'twitter:description': 'AI visibility audits for small businesses.',
      'twitter:image': 'https://example.com/logo.png',
    },
    canonicalUrl: 'https://example.com/',
    viewport: 'width=device-width, initial-scale=1',
    hasFavicon: true,
    lang: 'en',
    charset: 'utf-8',
    schemaObjects: [
      {
        type: 'Organization',
        raw: {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Example Co',
          url: 'https://example.com/',
          description: 'Example Co helps businesses improve AI visibility.',
          logo: 'https://example.com/logo.png',
          sameAs: [
            'https://linkedin.com/company/example',
            'https://x.com/example',
          ],
        },
      },
    ],
    schemaParseErrors: 0,
    internalLinks: ['/about', '/contact', '/services/ai-audit'],
    externalLinks: [
      'https://linkedin.com/company/example',
      'https://x.com/example',
    ],
    textContent:
      'Example Co helps businesses improve AI visibility. Updated 2026. Learn about our audit and services.',
    wordCount: 420,
    lastModified: 'Tue, 10 Mar 2026 12:00:00 GMT',
    statusCode: 200,
    loadTimeMs: 120,
    classification: 'homepage',
    detectedPlatform,
  };

  const aboutPage = {
    ...homepage,
    url: 'https://example.com/about',
    title: 'About Example Co',
    h1s: ['About Example Co'],
    internalLinks: ['/contact', '/services/ai-audit', '/faq'],
    externalLinks: [
      'https://linkedin.com/company/example',
      'https://x.com/example',
    ],
    textContent:
      'About Example Co. Example Co helps local businesses become visible in AI search and answer engines.',
    wordCount: 260,
    classification: 'about',
  };

  const servicePage = {
    ...homepage,
    url: 'https://example.com/services/ai-audit',
    title: 'AI Audit Services | Example Co',
    h1s: ['AI Audit Services'],
    internalLinks: ['/about', '/contact', '/faq'],
    externalLinks: ['https://linkedin.com/company/example'],
    textContent:
      'Our AI audit services improve llms.txt coverage, schema quality, sitemap health, and topical authority for businesses.',
    wordCount: 360,
    classification: 'service',
  };

  const faqPage = {
    ...homepage,
    url: 'https://example.com/faq',
    title: 'FAQ | Example Co',
    h1s: ['What is AI Search Optimization?', 'How do I add llms.txt?'],
    internalLinks: ['/about', '/contact', '/services/ai-audit'],
    externalLinks: ['https://linkedin.com/company/example'],
    schemaObjects: [{ type: 'FAQPage', raw: { '@type': 'FAQPage' } }],
    textContent:
      'Frequently asked questions about AI Search Optimization, llms.txt, schema, and site visibility.',
    wordCount: 310,
    classification: 'faq',
  };

  const contactPage = {
    ...homepage,
    url: 'https://example.com/contact',
    title: 'Contact Example Co',
    h1s: ['Contact Example Co'],
    internalLinks: ['/about', '/services/ai-audit', '/faq'],
    externalLinks: ['https://linkedin.com/company/example'],
    textContent:
      'Contact Example Co by phone, email, or visit our office in Denver for AI visibility help.',
    wordCount: 180,
    classification: 'contact',
  };

  return {
    url: 'https://example.com/',
    normalizedUrl: 'https://example.com',
    detectedPlatform,
    rootHttp: {
      finalUrl: 'https://example.com/',
      statusCode: 200,
      https: true,
      headers: {
        'strict-transport-security': 'max-age=63072000; includeSubDomains',
        'content-security-policy': "default-src 'self'",
        'x-frame-options': 'SAMEORIGIN',
        'x-content-type-options': 'nosniff',
      },
      strictTransportSecurity: 'max-age=63072000; includeSubDomains',
      contentSecurityPolicy: "default-src 'self'",
      xFrameOptions: 'SAMEORIGIN',
      xContentTypeOptions: 'nosniff',
    },
    renderReadiness: {
      mode: 'server-rendered',
      detail: 'Meaningful homepage content is visible without client-side execution.',
    },
    robotsTxt: {
      exists: true,
      raw: 'User-agent: GPTBot\nAllow: /\nSitemap: https://example.com/sitemap.xml',
      allowsGPTBot: true,
      allowsPerplexityBot: true,
      allowsClaudeBot: true,
      allowsGoogleBot: true,
      sitemapReferences: ['https://example.com/sitemap.xml'],
    },
    sitemap: {
      exists: true,
      urls: [
        'https://example.com/',
        'https://example.com/about',
        'https://example.com/contact',
      ],
      urlCount: 3,
      referencedInRobots: true,
      accessStatus: 'ok',
      format: 'xml',
      sourceUrl: 'https://example.com/sitemap.xml',
    },
    llmsTxt: {
      exists: true,
      raw: '# Example Co',
      title: 'Example Co',
      description: 'Example Co helps businesses improve AI visibility.',
      sections: [{ heading: 'Key Pages', content: 'About and services' }],
      links: [
        { title: 'About', url: 'https://example.com/about' },
        { title: 'Services', url: 'https://example.com/services/ai-audit' },
      ],
    },
    pages: [homepage, aboutPage, servicePage, faqPage, contactPage],
    homepage,
    crawledAt: Date.now(),
    durationMs: 1500,
    errors: [],
    ...overrides,
  };
}

async function saveCompletedScan(id, overrides = {}) {
  const crawlData = overrides.crawlData || createCrawlData();
  const scoreResult = overrides.scoreResult || scoreCrawlData(crawlData);
  const scan = {
    id,
    url: crawlData.url,
    normalizedUrl: crawlData.normalizedUrl,
    status: 'complete',
    progress: {
      status: 'complete',
      checks: initialProgress().checks.map((check) => ({
        ...check,
        status: 'done',
      })),
    },
    createdAt: overrides.createdAt || Date.now(),
    completedAt: overrides.completedAt || Date.now(),
    crawlData,
    scoreResult,
    paid: overrides.paid || false,
    email: overrides.email || 'owner@example.com',
    generatedFiles: overrides.generatedFiles,
  };

  await mockDb.saveScan(scan);
  return scan;
}

test('fetchRobotsTxt parses sitemap references and AI bot access', async () => {
  await withMockFetch(
    async () => ({
      ok: true,
      text: async () => `User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: https://example.com/sitemap.xml`,
    }),
    async () => {
      const data = await fetchRobotsTxt('https://example.com');

      assert.equal(data.exists, true);
      assert.equal(data.allowsGPTBot, true);
      assert.equal(data.allowsPerplexityBot, true);
      assert.equal(data.allowsClaudeBot, true);
      assert.deepEqual(data.sitemapReferences, ['https://example.com/sitemap.xml']);
    }
  );
});

test('fetchRobotsTxt does not treat path-specific disallows as a site-wide block', async () => {
  await withMockFetch(
    async () => ({
      ok: true,
      text: async () => `User-agent: GPTBot
Disallow: /private

User-agent: *
Disallow:
`,
    }),
    async () => {
      const data = await fetchRobotsTxt('https://example.com');

      assert.equal(data.allowsGPTBot, true);
      assert.equal(data.allowsPerplexityBot, true);
    }
  );
});

test('fetchSitemap parses XML URLs and tracks robots references', async () => {
  await withMockFetch(
    async () => ({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about</loc></url>
</urlset>`,
    }),
    async () => {
      const data = await fetchSitemap(
        'https://example.com',
        ['https://example.com/sitemap.xml']
      );

      assert.equal(data.exists, true);
      assert.equal(data.urlCount, 2);
      assert.equal(data.referencedInRobots, true);
      assert.equal(data.accessStatus, 'ok');
      assert.equal(data.format, 'xml');
      assert.deepEqual(data.urls, [
        'https://example.com/',
        'https://example.com/about',
      ]);
    }
  );
});

test('fetchSitemap follows sitemap indexes to actual page URLs', async () => {
  await withMockFetch(
    async (url) => {
      if (url === 'https://example.com/sitemap.xml') {
        return {
          ok: true,
          text: async () => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
</sitemapindex>`,
        };
      }

      return {
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about</loc></url>
</urlset>`,
      };
    },
    async () => {
      const data = await fetchSitemap(
        'https://example.com',
        ['https://example.com/sitemap.xml']
      );

      assert.equal(data.exists, true);
      assert.deepEqual(data.urls, [
        'https://example.com/',
        'https://example.com/about',
      ]);
    }
  );
});

test('fetchSitemap parses JSON API-style sitemap payloads', async () => {
  await withMockFetch(
    async () => ({
      ok: true,
      text: async () => JSON.stringify({
        sitemap: {
          urls: ['https://example.com/', 'https://example.com/docs'],
        },
      }),
    }),
    async () => {
      const data = await fetchSitemap('https://example.com', ['https://example.com/sitemap-api']);

      assert.equal(data.exists, true);
      assert.equal(data.format, 'json');
      assert.deepEqual(data.urls, ['https://example.com/', 'https://example.com/docs']);
    }
  );
});

test('fetchSitemap returns blocked status for bot-protected sitemap endpoints', async () => {
  await withMockFetch(
    async () => ({
      ok: false,
      status: 403,
      text: async () => 'forbidden',
    }),
    async () => {
      const data = await fetchSitemap('https://example.com', ['https://example.com/w/rest.php/site/v1/sitemap/0']);

      assert.equal(data.exists, false);
      assert.equal(data.accessStatus, 'blocked');
      assert.equal(data.referencedInRobots, true);
    }
  );
});

test('fetchLlmsTxt extracts title, description, sections, and links', async () => {
  await withMockFetch(
    async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
      text: async () => `# Example Co

> Example Co helps businesses improve AI visibility.

## Key Pages
- [About](https://example.com/about): Learn about the company
- [Services](https://example.com/services): See core services`,
    }),
    async () => {
      const data = await fetchLlmsTxt('https://example.com');

      assert.equal(data.exists, true);
      assert.equal(data.title, 'Example Co');
      assert.equal(
        data.description,
        'Example Co helps businesses improve AI visibility.'
      );
      assert.equal(data.sections.length, 1);
      assert.equal(data.links.length, 2);
    }
  );
});

test('extractFallbackPageData parses useful crawl signals from raw HTML', () => {
  const page = extractFallbackPageData({
    url: 'https://example.com/about',
    startTime: Date.now() - 10,
    html: `<!doctype html>
      <html>
        <head>
          <title>About Example Co</title>
          <meta name="description" content="About Example Co" />
          <meta property="og:image" content="https://example.com/logo.png" />
          <script type="application/ld+json">
            {"@context":"https://schema.org","@type":"Organization","name":"Example Co","url":"https://example.com"}
          </script>
        </head>
        <body>
          <h1>About Example Co</h1>
          <a href="/contact">Contact</a>
          <a href="https://linkedin.com/company/example">LinkedIn</a>
          <p>Example Co helps businesses become visible in AI search.</p>
        </body>
      </html>`,
  });

  assert.equal(page.title, 'About Example Co');
  assert.equal(page.metaDescription, 'About Example Co');
  assert.deepEqual(page.h1s, ['About Example Co']);
  assert.equal(page.schemaObjects.length, 1);
  assert.deepEqual(page.internalLinks, ['/contact']);
  assert.deepEqual(page.externalLinks, ['https://linkedin.com/company/example']);
  assert.equal(page.classification, 'about');
});

test('extractFallbackPageData extracts JSON-LD entries from @graph blocks', () => {
  const page = extractFallbackPageData({
    url: 'https://example.com',
    startTime: Date.now() - 10,
    html: `<!doctype html>
      <html lang="en">
        <head>
          <title>Example</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@graph": [
                { "@type": "Organization", "name": "Example Co", "url": "https://example.com" },
                { "@type": "FAQPage", "name": "FAQ" }
              ]
            }
          </script>
        </head>
        <body><h1>Example</h1></body>
      </html>`,
  });

  assert.deepEqual(
    page.schemaObjects.map((item) => item.type),
    ['Organization', 'FAQPage']
  );
});

test('detectPlatform identifies WordPress, Squarespace, Webflow, and custom sites', () => {
  assert.equal(detectPlatform({ metaGenerator: 'WordPress 6.5.2' }), 'wordpress');
  assert.equal(
    detectPlatform({
      assetUrls: ['https://static1.squarespace.com/static/site.css'],
    }),
    'squarespace'
  );
  assert.equal(
    detectPlatform({
      html: '<script src="https://cdn.prod.website-files.com/js/webflow.js"></script>',
    }),
    'webflow'
  );
  assert.equal(detectPlatform({ metaGenerator: 'Astro 4.0' }), 'custom');
});

test('crawlPageWithoutBrowser falls back to fetch-only extraction', async () => {
  await withMockFetch(
    async () => ({
      ok: true,
      status: 200,
      url: 'https://example.com/',
      headers: new Headers({
        'last-modified': 'Tue, 10 Mar 2026 12:00:00 GMT',
      }),
      text: async () => `<!doctype html>
        <html>
          <head><title>Example Co</title></head>
          <body><h1>Example Co</h1><a href="/about">About</a></body>
        </html>`,
    }),
    async () => {
      const page = await crawlPageWithoutBrowser('https://example.com', Date.now());

      assert.ok(page);
      assert.equal(page.title, 'Example Co');
      assert.deepEqual(page.internalLinks, ['/about']);
      assert.equal(page.lastModified, 'Tue, 10 Mar 2026 12:00:00 GMT');
    }
  );
});

test('scoreCrawlData returns a strong score and prioritized fixes', () => {
  const score = scoreCrawlData(createCrawlData());

  assert.equal(score.band, 'ai-ready');
  assert.ok(score.percentage >= 80);
  assert.equal(score.dimensions.length, 6);
  assert.ok(Array.isArray(score.fixes));
});

test('scoreCrawlData fails schema validity when malformed JSON-LD is present', () => {
  const crawlData = createCrawlData();
  crawlData.homepage.schemaParseErrors = 1;
  crawlData.pages[0].schemaParseErrors = 1;

  const score = scoreCrawlData(crawlData);
  const dimension = score.dimensions.find((item) => item.key === 'structured-data');
  const validity = dimension.checks.find((item) => item.id === 'sd-validation');

  assert.equal(validity.verdict, 'fail');
  assert.match(validity.detail, /malformed JSON-LD/i);
});

test('scoreCrawlData excludes unknown checks from the denominator for portal-like crawls', () => {
  const crawlData = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      title: 'Developer Docs',
      metaDescription: 'Documentation and API reference for a developer platform.',
    },
  });

  crawlData.pages = [
    {
      ...crawlData.homepage,
      url: 'https://example.com/docs',
      title: 'API Reference',
      classification: 'other',
      internalLinks: ['/guides', '/reference'],
      textContent: 'API reference content for multiple features and endpoints.',
      wordCount: 180,
    },
    {
      ...crawlData.homepage,
      url: 'https://example.com/guides',
      title: 'Guides',
      classification: 'other',
      internalLinks: ['/docs', '/reference'],
      textContent: 'Guides and setup docs for the developer platform.',
      wordCount: 220,
    },
    {
      ...crawlData.homepage,
      url: 'https://example.com/reference',
      title: 'Reference',
      classification: 'other',
      internalLinks: ['/docs', '/guides'],
      textContent: 'Reference pages for many APIs and concepts.',
      wordCount: 190,
    },
  ];
  crawlData.homepage = crawlData.pages[0];
  crawlData.sitemap.exists = false;
  crawlData.sitemap.accessStatus = 'blocked';
  crawlData.sitemap.urlCount = 0;

  const score = scoreCrawlData(crawlData);
  const contentSignals = score.dimensions.find((item) => item.key === 'content-signals');
  const aboutCheck = contentSignals.checks.find((item) => item.id === 'cs-about');
  const contactCheck = contentSignals.checks.find((item) => item.id === 'cs-contact');

  assert.equal(aboutCheck.verdict, 'unknown');
  assert.equal(contactCheck.verdict, 'unknown');
  assert.ok(contentSignals.maxScore < contentSignals.checks.reduce((sum, item) => sum + item.maxPoints, 0));
});

test('runWebHealthEnrichment returns quality, performance, and security pillars', async () => {
  const webHealth = await runWebHealthEnrichment(createCrawlData());

  assert.equal(webHealth.status, 'complete');
  assert.equal(webHealth.pillars.length, 3);
  assert.ok(webHealth.percentage >= 70);
  assert.ok(webHealth.metrics.length >= 3);
});

test('scoreCrawlData merges AI and Web Health fixes when enrichment is available', async () => {
  const crawlData = createCrawlData();
  const webHealth = await runWebHealthEnrichment(crawlData);
  const score = scoreCrawlData(crawlData, webHealth);

  assert.ok(score.webHealth);
  assert.equal(score.webHealth.status, 'complete');
  assert.ok(score.fixes.every((fix) => typeof fix.copyPrompt === 'string' && fix.copyPrompt.length > 0));
  assert.ok(score.fixes.every((fix) => fix.estimatedLift === fix.pointsAvailable));
});

test('generateAllFiles produces the paid deliverables', async () => {
  const files = await generateAllFiles(createCrawlData());

  assert.equal(files.detectedPlatform, 'custom');
  assert.equal(files.files.length, 4);
  assert.deepEqual(
    files.files.map((file) => file.filename),
    ['llms.txt', 'robots.txt', 'organization-schema.json', 'sitemap.xml']
  );
  assert.match(files.files[0].content, /# Example Co/);
  assert.match(files.files[1].content, /User-agent: GPTBot/);
});

test('generateAllFiles adds platform-specific install instructions', async () => {
  const files = await generateAllFiles(
    createCrawlData({ detectedPlatform: 'wordpress' })
  );
  const llmsFile = files.files.find((file) => file.filename === 'llms.txt');
  const schemaFile = files.files.find(
    (file) => file.filename === 'organization-schema.json'
  );

  assert.equal(files.detectedPlatform, 'wordpress');
  assert.match(llmsFile.installInstructions, /WordPress site root/i);
  assert.match(schemaFile.installInstructions, /header\/footer plugin/i);
});

test(
  'estimateRemainingSeconds returns pending defaults, bounded estimates, and omits completed scans',
  () => {
    const pendingProgress = initialProgress();
    const pendingScan = {
      status: 'pending',
      createdAt: 0,
      progress: pendingProgress,
    };

    const midProgress = initialProgress();
    midProgress.checks[0].status = 'done';
    midProgress.checks[1].status = 'done';
    midProgress.checks[2].status = 'running';
    const midScan = {
      status: 'crawling',
      createdAt: 0,
      progress: midProgress,
    };

    const slowProgress = initialProgress();
    slowProgress.checks[0].status = 'done';
    const slowScan = {
      status: 'crawling',
      createdAt: 0,
      progress: slowProgress,
    };

    assert.equal(estimateRemainingSeconds(pendingScan, 3_000), 30);
    assert.equal(estimateRemainingSeconds(midScan, 10_000), 35);
    assert.equal(estimateRemainingSeconds(slowScan, 120_000), 45);
    assert.equal(
      estimateRemainingSeconds(
        {
          status: 'complete',
          createdAt: 0,
          progress: initialProgress(),
        },
        10_000
      ),
      undefined
    );
    assert.equal(
      estimateRemainingSeconds(
        {
          status: 'failed',
          createdAt: 0,
          progress: initialProgress(),
        },
        10_000
      ),
      undefined
    );
  }
);

test(
  'startScan enforces the 3-audits-per-IP rolling limit and re-allows after the window',
  async () => {
    const now = 1_000_000;

    const first = await startScan(
      { url: 'https://example.com', ip: '1.2.3.4', userEmail: 'owner@example.com' },
      { db: mockDb, now }
    );
    const second = await startScan(
      { url: 'https://example.org', ip: '1.2.3.4', userEmail: 'owner@example.com' },
      { db: mockDb, now }
    );
    const third = await startScan(
      { url: 'https://example.net', ip: '1.2.3.4', userEmail: 'owner@example.com' },
      { db: mockDb, now }
    );
    const fourth = await startScan(
      { url: 'https://example.dev', ip: '1.2.3.4', userEmail: 'owner@example.com' },
      { db: mockDb, now }
    );
    const nextDay = await startScan(
      { url: 'https://example.dev', ip: '1.2.3.4', userEmail: 'owner@example.com' },
      { db: mockDb, now: now + DAY_MS + 1_000 }
    );

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 200);
    assert.equal(fourth.status, 429);
    assert.equal(fourth.body.limit, 3);
    assert.ok(Number(fourth.body.retryAfterSec) > 0);
    assert.equal(nextDay.status, 200);
  }
);

test(
  'startScan returns cached scans by default and bypasses cache when force is true',
  async () => {
    await saveCompletedScan('cached-scan', {
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    const cached = await startScan(
      { url: 'https://example.com', ip: '5.6.7.8', userEmail: 'owner@example.com' },
      { db: mockDb, now: Date.now() }
    );
    const forced = await startScan(
      { url: 'https://example.com', force: true, ip: '5.6.7.8', userEmail: 'owner@example.com' },
      { db: mockDb, now: Date.now() + 1 }
    );
    const forcedScan = await mockDb.getScan(forced.body.id);

    assert.equal(cached.status, 200);
    assert.deepEqual(cached.body, { id: 'cached-scan', cached: true });
    assert.equal(forced.status, 200);
    assert.equal(forced.body.cached, false);
    assert.notEqual(forced.body.id, 'cached-scan');
    assert.equal(forcedScan?.status, 'pending');
  }
);

test('createGeneratedFilesArchive includes each generated file in the ZIP payload', async () => {
  const files = await generateAllFiles(createCrawlData({ detectedPlatform: 'webflow' }));
  const archive = createGeneratedFilesArchive(files);
  const contents = unzipSync(archive);

  assert.deepEqual(
    Object.keys(contents).sort(),
    ['llms.txt', 'organization-schema.json', 'robots.txt', 'sitemap.xml']
  );
  assert.match(strFromU8(contents['llms.txt']), /# Example Co/);
  assert.match(strFromU8(contents['robots.txt']), /User-agent: GPTBot/);
});

test('archive route returns a downloadable ZIP for paid scans', async () => {
  const crawlData = createCrawlData({ detectedPlatform: 'squarespace' });
  const generatedFiles = await generateAllFiles(crawlData);
  await saveCompletedScan('paid-scan', {
    crawlData,
    generatedFiles,
    paid: true,
  });

  const response = await archiveRoute.GET(
    createAuthedRequest('http://localhost/api/scan/paid-scan/files/archive'),
    {
      params: Promise.resolve({ id: 'paid-scan' }),
    }
  );
  const contents = unzipSync(new Uint8Array(await response.arrayBuffer()));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/zip');
  assert.match(
    response.headers.get('content-disposition') || '',
    /aiso-files-example\.com\.zip/
  );
  assert.deepEqual(
    Object.keys(contents).sort(),
    ['llms.txt', 'organization-schema.json', 'robots.txt', 'sitemap.xml']
  );
});

test('report route includes web-health summary and copy-to-LLM payloads', async () => {
  const crawlData = createCrawlData();
  const webHealth = await runWebHealthEnrichment(crawlData);
  await saveCompletedScan('report-payload', {
    crawlData,
    scoreResult: scoreCrawlData(crawlData, webHealth),
    email: 'owner@example.com',
  });

  const response = await reportRoute.GET(
    createAuthedRequest('http://localhost/api/scan/report-payload/report'),
    {
      params: Promise.resolve({ id: 'report-payload' }),
    }
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.webHealth.status, 'complete');
  assert.match(payload.copyToLlm.fullPrompt, /Priority fixes/i);
  assert.equal(payload.scores.aiVisibility, payload.score.scores.aiVisibility);
  assert.ok(payload.scores.overall >= 0);
  assert.ok(Array.isArray(payload.copyToLlm.fixPrompts));
});

test('public score summary only resolves for completed scans', async () => {
  const completeScan = await saveCompletedScan('public-score', {
    email: 'founder@example.com',
  });
  await mockDb.saveScan({
    id: 'pending-score',
    url: 'https://example.com/',
    normalizedUrl: 'https://example.com',
    status: 'pending',
    progress: initialProgress(),
    createdAt: Date.now(),
  });

  const summary = await getPublicScoreSummary('public-score');
  const missing = await getPublicScoreSummary('missing-score');
  const pending = await getPublicScoreSummary('pending-score');

  assert.equal(summary.id, completeScan.id);
  assert.equal(summary.domain, 'example.com');
  assert.equal(summary.percentage, completeScan.scoreResult.percentage);
  assert.equal(missing, null);
  assert.equal(pending, null);
});

test('public score page renders for completed scans and 404s otherwise', async () => {
  await saveCompletedScan('public-page');
  await mockDb.saveScan({
    id: 'incomplete-page',
    url: 'https://example.com/',
    normalizedUrl: 'https://example.com',
    status: 'crawling',
    progress: initialProgress(),
    createdAt: Date.now(),
  });

  const page = await publicScorePage.default({
    params: Promise.resolve({ id: 'public-page' }),
  });
  const metadata = await publicScorePage.generateMetadata({
    params: Promise.resolve({ id: 'public-page' }),
  });

  assert.equal(page.type, 'div');
  assert.match(String(metadata.title), /example\.com scored/i);

  await assert.rejects(
    () =>
      publicScorePage.default({
        params: Promise.resolve({ id: 'missing-page' }),
      }),
    (err) => err && err.digest === 'NEXT_HTTP_ERROR_FALLBACK;404'
  );

  await assert.rejects(
    () =>
      publicScorePage.default({
        params: Promise.resolve({ id: 'incomplete-page' }),
      }),
    (err) => err && err.digest === 'NEXT_HTTP_ERROR_FALLBACK;404'
  );
});

test('domain verification can start, confirm, and publish a leaderboard entry', async () => {
  const scan = await saveCompletedScan('verified-public', {
    email: 'owner@example.com',
  });

  const started = await startDomainVerification({
    scanId: scan.id,
    url: scan.url,
    email: scan.email,
    enablePublicScore: true,
    enableBadge: true,
    enableLeaderboard: true,
  });

  assert.equal(started.instructions.domain, 'example.com');
  assert.match(started.instructions.metaTag, /aiso-verification/);

  await withMockFetch(
    async (url) => {
      if (url === 'https://example.com' || url === 'https://example.com/') {
        return {
          ok: true,
          text: async () =>
            `<!doctype html><html><head>${started.instructions.metaTag}</head><body></body></html>`,
        };
      }

      return {
        ok: false,
        text: async () => '',
      };
    },
    async () => {
      const confirmed = await confirmDomainVerification({
        domain: 'example.com',
        enablePublicScore: true,
        enableBadge: true,
        enableLeaderboard: true,
      });

      assert.equal(confirmed.verified, true);
      assert.equal(confirmed.method, 'meta-tag');
    }
  );

  const leaderboard = await listLeaderboardEntries(10);
  assert.equal(leaderboard.length, 1);
  assert.equal(leaderboard[0].summary.id, scan.id);
  assert.equal(leaderboard[0].summary.domain, 'example.com');
});

test('leaderboard filtering keeps the best score within the selected time window', async () => {
  const oldHighScore = scoreCrawlData(createCrawlData());
  oldHighScore.percentage = 95;
  oldHighScore.scores.overall = 95;
  oldHighScore.scores.aiVisibility = 92;

  const recentExampleScore = scoreCrawlData(createCrawlData());
  recentExampleScore.percentage = 81;
  recentExampleScore.scores.overall = 81;
  recentExampleScore.scores.aiVisibility = 79;

  const recentChallengerScore = scoreCrawlData(
    createCrawlData({
      url: 'https://contender.com/',
      normalizedUrl: 'https://contender.com',
    })
  );
  recentChallengerScore.percentage = 88;
  recentChallengerScore.scores.overall = 88;
  recentChallengerScore.scores.aiVisibility = 84;

  await saveCompletedScan('example-old-high', {
    completedAt: Date.now() - 40 * DAY_MS,
    scoreResult: oldHighScore,
  });
  await saveCompletedScan('example-recent', {
    completedAt: Date.now() - 2 * DAY_MS,
    scoreResult: recentExampleScore,
  });
  await saveCompletedScan('contender-recent', {
    completedAt: Date.now() - 12 * 60 * 60 * 1000,
    crawlData: createCrawlData({
      url: 'https://contender.com/',
      normalizedUrl: 'https://contender.com',
    }),
    scoreResult: recentChallengerScore,
  });

  const allTime = await listLeaderboardEntriesFiltered(10, 'all');
  const last30Days = await listLeaderboardEntriesFiltered(10, '30d');
  const last24Hours = await listLeaderboardEntriesFiltered(10, '24h');

  assert.equal(allTime[0].summary.domain, 'example.com');
  assert.equal(allTime[0].summary.percentage, 95);
  assert.equal(last30Days[0].summary.domain, 'contender.com');
  assert.equal(last30Days[1].summary.domain, 'example.com');
  assert.equal(last30Days[1].summary.percentage, 81);
  assert.equal(last24Hours.length, 1);
  assert.equal(last24Hours[0].summary.domain, 'contender.com');
});

test('monitoring records can be added and removed for owned scans', async () => {
  const scan = await saveCompletedScan('monitoring-scan', {
    email: 'alerts@example.com',
  });

  const record = await addMonitoringDomain({
    scanId: scan.id,
    alertThreshold: 7,
  });

  assert.equal(record.domain, 'example.com');
  assert.equal(record.alertThreshold, 7);
  assert.equal(record.opportunityAlertsEnabled, true);
  assert.equal(record.lastOpportunityAlertAt, null);

  const activeRecords = await listMonitoringDomains('alerts@example.com');
  assert.equal(activeRecords.length, 1);
  assert.equal(activeRecords[0].scanId, scan.id);

  const updated = await updateMonitoringDomain('example.com', 'alerts@example.com', {
    opportunityAlertsEnabled: false,
    lastOpportunityAlertAt: Date.now(),
  });
  assert.equal(updated.opportunityAlertsEnabled, false);
  assert.ok(updated.lastOpportunityAlertAt);

  const removed = await removeMonitoringDomain('example.com', 'alerts@example.com');
  assert.equal(removed, true);

  const remainingRecords = await listMonitoringDomains('alerts@example.com');
  assert.equal(remainingRecords.length, 0);
});

test('opportunity summary ranks providers and pages for qualifying traffic', () => {
  const crawlerVisits = [];
  const referralVisits = [];

  for (let index = 0; index < 15; index += 1) {
    crawlerVisits.push({
      id: `c-${index}`,
      domain: 'example.com',
      botName: 'ClaudeBot',
      botCategory: 'citation',
      pagePath: '/pricing',
      userAgent: null,
      responseCode: 200,
      visitedAt: new Date().toISOString(),
    });
  }

  for (let index = 0; index < 7; index += 1) {
    crawlerVisits.push({
      id: `p-${index}`,
      domain: 'example.com',
      botName: 'GPTBot',
      botCategory: 'citation',
      pagePath: '/blog/ai-visibility',
      userAgent: null,
      responseCode: 200,
      visitedAt: new Date().toISOString(),
    });
  }

  for (let index = 0; index < 3; index += 1) {
    crawlerVisits.push({
      id: `x-${index}`,
      domain: 'example.com',
      botName: 'PerplexityBot',
      botCategory: 'citation',
      pagePath: '/compare',
      userAgent: null,
      responseCode: 200,
      visitedAt: new Date().toISOString(),
    });
  }

  referralVisits.push({
    id: 'r-1',
    domain: 'example.com',
    sourceEngine: 'chatgpt',
    referrerUrl: 'https://chat.openai.com',
    landingPage: '/pricing',
    userAgent: null,
    visitedAt: new Date().toISOString(),
  });

  const summary = buildOpportunityAlertSummary({
    domain: 'example.com',
    latestScanId: 'scan-1',
    crawlerVisits,
    referralVisits,
  });

  assert.ok(summary);
  assert.equal(summary.crawlerVisits, 25);
  assert.equal(summary.referralVisits, 1);
  assert.deepEqual(summary.topProviders.map((provider) => provider.provider), ['claude', 'chatgpt', 'perplexity']);
  assert.deepEqual(summary.topPages.map((page) => page.path), ['/pricing', '/blog/ai-visibility', '/compare']);
  assert.equal(summary.topPages[0].referralVisits, 1);
});

test('opportunity summary returns null below threshold and omits sparse pages', () => {
  const belowThreshold = buildOpportunityAlertSummary({
    domain: 'example.com',
    latestScanId: 'scan-1',
    crawlerVisits: Array.from({ length: 24 }, (_, index) => ({
      id: `c-${index}`,
      domain: 'example.com',
      botName: 'ClaudeBot',
      botCategory: 'citation',
      pagePath: `/page-${index}`,
      userAgent: null,
      responseCode: 200,
      visitedAt: new Date().toISOString(),
    })),
    referralVisits: [],
  });

  assert.equal(belowThreshold, null);

  const sparsePages = buildOpportunityAlertSummary({
    domain: 'example.com',
    latestScanId: 'scan-2',
    crawlerVisits: Array.from({ length: 25 }, (_, index) => ({
      id: `s-${index}`,
      domain: 'example.com',
      botName: 'GPTBot',
      botCategory: 'citation',
      pagePath: `/page-${index}`,
      userAgent: null,
      responseCode: 200,
      visitedAt: new Date().toISOString(),
    })),
    referralVisits: [],
  });

  assert.ok(sparsePages);
  assert.deepEqual(sparsePages.topPages, []);
});

test('opportunity cooldown uses a 7 day window', () => {
  const now = Date.now();
  assert.equal(hasOpportunityAlertCooldownElapsed(null, now), true);
  assert.equal(hasOpportunityAlertCooldownElapsed(now - OPPORTUNITY_ALERT_COOLDOWN_MS + 1000, now), false);
  assert.equal(hasOpportunityAlertCooldownElapsed(now - OPPORTUNITY_ALERT_COOLDOWN_MS - 1000, now), true);
});

test('mock alert service logs opportunity alert payload', async () => {
  const originalLog = console.log;
  const entries = [];
  console.log = (message) => { entries.push(String(message)); };

  try {
    await mockAlertService.sendOpportunityAlert({
      recipientEmail: 'alerts@example.com',
      summary: {
        domain: 'example.com',
        latestScanId: 'scan-1',
        crawlerVisits: 25,
        referralVisits: 1,
        topProviders: [{ provider: 'claude', visits: 15 }],
        topPages: [{ path: '/pricing', crawlerVisits: 12, referralVisits: 1 }],
      },
    });
  } finally {
    console.log = originalLog;
  }

  assert.equal(entries.length, 1);
  assert.match(entries[0], /Opportunity alert for example\.com: 25 crawler visits vs 1 AI referrals/);
});

test('PATCH /api/monitoring/[domain] updates opportunity alert preferences', async () => {
  const scan = await saveCompletedScan('monitoring-patch', {
    email: 'alerts@example.com',
  });
  await addMonitoringDomain({ scanId: scan.id, alertThreshold: 5 });

  const request = createAuthedJsonRequest(
    'http://localhost/api/monitoring/example.com',
    'PATCH',
    { opportunityAlertsEnabled: false },
    'alerts@example.com'
  );
  const response = await monitoringDomainRoute.PATCH(request, {
    params: Promise.resolve({ domain: 'example.com' }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.opportunityAlertsEnabled, false);

  const invalidRequest = createAuthedJsonRequest(
    'http://localhost/api/monitoring/example.com',
    'PATCH',
    { opportunityAlertsEnabled: 'nope' },
    'alerts@example.com'
  );
  const invalidResponse = await monitoringDomainRoute.PATCH(invalidRequest, {
    params: Promise.resolve({ domain: 'example.com' }),
  });

  assert.equal(invalidResponse.status, 400);
});

test('GET /api/opportunity-alert respects auth and monitoring gates', async () => {
  const unauthResponse = await opportunityAlertRoute.GET(new NextRequest('http://localhost/api/opportunity-alert?domain=example.com'));
  assert.equal(unauthResponse.status, 401);

  const scan = await saveCompletedScan('opportunity-scan', {
    email: 'alerts@example.com',
  });
  await addMonitoringDomain({ scanId: scan.id, alertThreshold: 5 });
  await seedOpportunityTraffic();

  const request = createAuthedRequest('http://localhost/api/opportunity-alert?domain=example.com', 'alerts@example.com');
  const response = await opportunityAlertRoute.GET(request);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.opportunity.crawlerVisits, 25);
  assert.equal(payload.opportunity.referralVisits, 1);

  await updateMonitoringDomain('example.com', 'alerts@example.com', {
    opportunityAlertsEnabled: false,
  });

  const gatedResponse = await opportunityAlertRoute.GET(
    createAuthedRequest('http://localhost/api/opportunity-alert?domain=example.com', 'alerts@example.com')
  );
  const gatedPayload = await gatedResponse.json();
  assert.equal(gatedPayload.opportunity, null);
});

test('cron opportunity alerts send once, then respect cooldown and disablement', async () => {
  const originalSecret = process.env.MONITORING_SECRET;
  process.env.MONITORING_SECRET = 'test-monitor-secret';

  const scan = await saveCompletedScan('cron-opportunity', {
    email: 'alerts@example.com',
  });
  await addMonitoringDomain({ scanId: scan.id, alertThreshold: 5 });
  await seedOpportunityTraffic();

  const originalLog = console.log;
  const entries = [];
  console.log = (message) => { entries.push(String(message)); };

  try {
    const request = new NextRequest('http://localhost/api/cron/monitor', {
      headers: { authorization: 'Bearer test-monitor-secret' },
    });

    const firstResponse = await cronMonitorRoute.GET(request);
    const firstPayload = await firstResponse.json();
    assert.equal(firstResponse.status, 200);
    assert.equal(firstPayload.opportunityAlerts[0].status, 'sent');
    assert.ok(entries.some((entry) => entry.includes('Opportunity alert for example.com')));

    entries.length = 0;

    const cooldownResponse = await cronMonitorRoute.GET(new NextRequest('http://localhost/api/cron/monitor', {
      headers: { authorization: 'Bearer test-monitor-secret' },
    }));
    const cooldownPayload = await cooldownResponse.json();
    assert.equal(cooldownPayload.opportunityAlerts[0].status, 'cooldown active');
    assert.equal(entries.length, 0);

    await updateMonitoringDomain('example.com', 'alerts@example.com', {
      opportunityAlertsEnabled: false,
      lastOpportunityAlertAt: null,
    });

    const disabledResponse = await cronMonitorRoute.GET(new NextRequest('http://localhost/api/cron/monitor', {
      headers: { authorization: 'Bearer test-monitor-secret' },
    }));
    const disabledPayload = await disabledResponse.json();
    assert.equal(disabledPayload.opportunityAlerts[0].status, 'disabled');
    assert.equal(entries.length, 0);
  } finally {
    console.log = originalLog;
    if (originalSecret === undefined) {
      delete process.env.MONITORING_SECRET;
    } else {
      process.env.MONITORING_SECRET = originalSecret;
    }
  }
});
