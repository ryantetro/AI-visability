require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const { strFromU8, unzipSync } = require('fflate');

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
const archiveRoute = require('../src/app/api/scan/[id]/files/archive/route.ts');
const reportRoute = require('../src/app/api/scan/[id]/report/route.ts');
const publicScorePage = require('../src/app/score/[id]/page.tsx');

const DAY_MS = 24 * 60 * 60 * 1000;

test.beforeEach(() => {
  resetMockDb();
  resetScanRateLimitStore();
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
    email: overrides.email,
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
    assert.equal(estimateRemainingSeconds(midScan, 10_000), 30);
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
      { url: 'https://example.com', ip: '1.2.3.4' },
      { db: mockDb, now }
    );
    const second = await startScan(
      { url: 'https://example.org', ip: '1.2.3.4' },
      { db: mockDb, now }
    );
    const third = await startScan(
      { url: 'https://example.net', ip: '1.2.3.4' },
      { db: mockDb, now }
    );
    const fourth = await startScan(
      { url: 'https://example.dev', ip: '1.2.3.4' },
      { db: mockDb, now }
    );
    const nextDay = await startScan(
      { url: 'https://example.dev', ip: '1.2.3.4' },
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
      { url: 'https://example.com', ip: '5.6.7.8' },
      { db: mockDb, now: Date.now() }
    );
    const forced = await startScan(
      { url: 'https://example.com', force: true, ip: '5.6.7.8' },
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
    new Request('http://localhost/api/scan/paid-scan/files/archive'),
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
    new Request('http://localhost/api/scan/report-payload/report'),
    {
      params: Promise.resolve({ id: 'report-payload' }),
    }
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.webHealth.status, 'complete');
  assert.match(payload.copyToLlm.reportPrompt, /Priority fixes/i);
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
