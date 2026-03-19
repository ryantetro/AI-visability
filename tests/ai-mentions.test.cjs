require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  analyzeResponse,
  computeScore,
  extractCitationUrls,
  fuzzyMatch,
  computeShareOfVoice,
  computeSentimentSummary,
  computeTopicPerformance,
  computeCompetitorLeaderboard,
} = require('../src/lib/ai-mentions/mention-analyzer.ts');

const {
  generatePrompts,
  buildBusinessProfile,
  inferBusinessName,
  inferIndustry,
  inferLocation,
  isValidPromptText,
} = require('../src/lib/ai-mentions/prompt-generator.ts');
const { discoverCompetitors } = require('../src/lib/ai-mentions/competitor-discovery.ts');

const {
  extractSiteContent,
  extractProducts,
  extractServices,
  extractFeatures,
  extractCompetitors,
  extractUSPs,
  extractFAQQueries,
  extractBlogTopics,
  extractGeoAreas,
  extractPricingTiers,
  extractTargetAudience,
  extractIndustryTerms,
  extractUseCases,
  extractProblemStatements,
  extractIntegrations,
  extractActionCapabilities,
  isJunk,
  looksLikeFragment,
} = require('../src/lib/ai-mentions/content-extractor.ts');

const { testAllEngines } = require('../src/lib/ai-mentions/engine-tester.ts');
const { runMentionTests } = require('../src/lib/ai-mentions/index.ts');
const { mockMentionTester } = require('../src/lib/services/mention-tester-mock.ts');
const {
  realMentionTester,
  canUseMentionTester,
} = require('../src/lib/services/mention-tester-real.ts');

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createCrawlData(overrides = {}) {
  const homepage = {
    url: 'https://example.com/',
    title: 'Example Co | AI Search',
    h1s: ['Example Co'],
    headings: [{ level: 1, text: 'Example Co' }],
    metaDescription:
      'Example Co helps businesses improve AI visibility with clear structured content.',
    metaKeywords: ['ai visibility'],
    ogTags: {
      'og:site_name': 'Example Co',
      'og:title': 'Example Co',
    },
    twitterTags: {},
    canonicalUrl: 'https://example.com/',
    viewport: 'width=device-width, initial-scale=1',
    hasFavicon: true,
    lang: 'en',
    charset: 'utf-8',
    schemaObjects: [],
    schemaParseErrors: 0,
    internalLinks: ['/about', '/contact'],
    externalLinks: [],
    textContent:
      'Example Co helps businesses improve AI visibility. Updated 2026. Learn about our audit and services.',
    wordCount: 420,
    lastModified: 'Tue, 10 Mar 2026 12:00:00 GMT',
    statusCode: 200,
    loadTimeMs: 120,
    classification: 'homepage',
    detectedPlatform: 'custom',
  };

  return {
    url: 'https://example.com/',
    normalizedUrl: 'https://example.com',
    detectedPlatform: 'custom',
    rootHttp: { finalUrl: 'https://example.com/', statusCode: 200, https: true, headers: {} },
    renderReadiness: { mode: 'server-rendered', detail: '' },
    robotsTxt: { exists: true, raw: '', allowsGPTBot: true, allowsPerplexityBot: true, allowsClaudeBot: true, allowsGoogleBot: true, sitemapReferences: [] },
    sitemap: { exists: true, urls: ['https://example.com/'], urlCount: 1, referencedInRobots: true, accessStatus: 'ok', format: 'xml', sourceUrl: '' },
    llmsTxt: { exists: false, raw: '', title: null, description: null, sections: [], links: [] },
    pages: [homepage],
    homepage,
    crawledAt: Date.now(),
    durationMs: 1000,
    errors: [],
    ...overrides,
  };
}

function createRichCrawlData() {
  const homepage = {
    url: 'https://acmetools.com/',
    title: 'AcmeTools | The #1 Project Management Platform',
    h1s: ['The #1 Project Management Platform'],
    headings: [
      { level: 1, text: 'The #1 Project Management Platform' },
      { level: 2, text: 'Trusted by leading enterprises worldwide' },
      { level: 2, text: 'Built for developers and teams' },
    ],
    metaDescription: 'AcmeTools is the leading project management solution for enterprises and startups.',
    metaKeywords: ['project management', 'task tracking', 'agile tools'],
    ogTags: { 'og:site_name': 'AcmeTools' },
    twitterTags: {},
    canonicalUrl: 'https://acmetools.com/',
    viewport: 'width=device-width, initial-scale=1',
    hasFavicon: true,
    lang: 'en',
    charset: 'utf-8',
    schemaObjects: [
      { type: 'Organization', raw: { name: 'AcmeTools', description: 'Award-winning project management for modern teams' } },
    ],
    schemaParseErrors: 0,
    internalLinks: ['/services', '/pricing', '/faq', '/blog'],
    externalLinks: ['https://competitor-one.com/integrations', 'https://twitter.com/acme'],
    textContent: 'AcmeTools is the leading project management platform for enterprises and startups. We offer comprehensive task tracking for teams. Built for developers in Denver, CO area. AcmeTools helps teams automate sprint reports and track progress in real time. Designed for agile coaches and project managers. Tired of manual status updates? Eliminate wasted meeting time with automated standups. Our platform integrates with Slack and Jira for seamless workflows. Use AcmeTools to generate weekly reports and share insights. Trusted by agile coaches worldwide.',
    wordCount: 800,
    lastModified: 'Mon, 01 Mar 2026 12:00:00 GMT',
    statusCode: 200,
    loadTimeMs: 100,
    classification: 'homepage',
    detectedPlatform: 'custom',
  };

  const servicePage = {
    url: 'https://acmetools.com/services',
    title: 'Our Services | AcmeTools',
    h1s: ['Our Services'],
    headings: [
      { level: 1, text: 'Our Services' },
      { level: 2, text: 'Agile Board Management' },
      { level: 2, text: 'Sprint Planning' },
      { level: 3, text: 'Real-time Collaboration Feature' },
      { level: 3, text: 'Automated Reporting Capability' },
    ],
    metaDescription: 'Explore AcmeTools services for project management.',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [
      { type: 'Product', raw: { name: 'AcmeBoard Pro' } },
      { type: 'Product', raw: { name: 'AcmeSprint Tracker' } },
    ],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: [],
    textContent: 'We provide agile board management and sprint planning. Our tools offer real-time collaboration. Enables teams to streamline project workflows. Built to save time on repetitive project tasks.',
    wordCount: 300,
    statusCode: 200,
    loadTimeMs: 90,
    classification: 'service',
    detectedPlatform: 'custom',
  };

  const faqPage = {
    url: 'https://acmetools.com/faq',
    title: 'FAQ | AcmeTools',
    h1s: ['Frequently Asked Questions'],
    headings: [
      { level: 1, text: 'Frequently Asked Questions' },
      { level: 2, text: 'How do I set up my first project?' },
      { level: 2, text: 'What integrations are available?' },
      { level: 2, text: 'Can I use AcmeTools for free?' },
    ],
    metaDescription: 'Find answers to common questions about AcmeTools.',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [
      {
        type: 'FAQPage',
        raw: {
          mainEntity: [
            { name: 'How does AcmeTools handle data security?' },
            { name: 'What is the difference between Pro and Enterprise plans?' },
          ],
        },
      },
    ],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: [],
    textContent: 'Answers to your most common questions about AcmeTools project management.',
    wordCount: 500,
    statusCode: 200,
    loadTimeMs: 80,
    classification: 'faq',
    detectedPlatform: 'custom',
  };

  const pricingPage = {
    url: 'https://acmetools.com/pricing',
    title: 'Pricing | AcmeTools',
    h1s: ['Simple Pricing'],
    headings: [
      { level: 1, text: 'Simple Pricing' },
      { level: 2, text: 'Free' },
      { level: 2, text: 'Pro' },
      { level: 2, text: 'Enterprise' },
    ],
    metaDescription: 'AcmeTools pricing plans for every team size.',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: [],
    textContent: 'Choose the right plan for your team. Free, Pro, or Enterprise.',
    wordCount: 200,
    statusCode: 200,
    loadTimeMs: 70,
    classification: 'other',
    detectedPlatform: 'custom',
  };

  const blogPage = {
    url: 'https://acmetools.com/blog/agile-best-practices',
    title: 'Agile Best Practices for Remote Teams | AcmeTools Blog',
    h1s: ['Agile Best Practices for Remote Teams'],
    headings: [
      { level: 1, text: 'Agile Best Practices for Remote Teams' },
      { level: 2, text: 'Setting Up Daily Standups' },
    ],
    metaDescription: 'Learn agile best practices for distributed teams.',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [
      { type: 'Article', raw: { headline: 'Agile Best Practices for Remote Teams' } },
    ],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: [],
    textContent: 'Agile methodology tips for remote and hybrid teams.',
    wordCount: 1200,
    statusCode: 200,
    loadTimeMs: 95,
    classification: 'blog',
    detectedPlatform: 'custom',
  };

  const allPages = [homepage, servicePage, faqPage, pricingPage, blogPage];

  return {
    url: 'https://acmetools.com/',
    normalizedUrl: 'https://acmetools.com',
    detectedPlatform: 'custom',
    rootHttp: { finalUrl: 'https://acmetools.com/', statusCode: 200, https: true, headers: {} },
    renderReadiness: { mode: 'server-rendered', detail: '' },
    robotsTxt: { exists: true, raw: '', allowsGPTBot: true, allowsPerplexityBot: true, allowsClaudeBot: true, allowsGoogleBot: true, sitemapReferences: [] },
    sitemap: { exists: true, urls: allPages.map((p) => p.url), urlCount: allPages.length, referencedInRobots: true, accessStatus: 'ok', format: 'xml', sourceUrl: '' },
    llmsTxt: { exists: false, raw: '', title: null, description: null, sections: [], links: [] },
    pages: allPages,
    homepage,
    crawledAt: Date.now(),
    durationMs: 2000,
    errors: [],
  };
}

function createMarineRetailCrawlData() {
  const homepage = {
    url: 'https://marine-products.com/',
    title: 'Boat Parts | Wakeboards | Salt Lake City, UT',
    h1s: ['Boat Parts and Watersports Gear'],
    headings: [
      { level: 1, text: 'Boat Parts and Watersports Gear' },
      { level: 2, text: 'Marine Parts' },
      { level: 2, text: 'Wakeboards' },
      { level: 2, text: 'Water Skis' },
      { level: 2, text: 'Shop by Brand' },
    ],
    metaDescription: 'Marine Products is one of the leading dealers of wakeboards, water skis, surfers, boat parts, and other water gear in the country.',
    metaKeywords: ['marine parts', 'wakeboards', 'boat accessories'],
    ogTags: { 'og:site_name': 'Marine Products' },
    twitterTags: {},
    canonicalUrl: 'https://marine-products.com/',
    viewport: 'width=device-width, initial-scale=1',
    hasFavicon: true,
    lang: 'en',
    charset: 'utf-8',
    schemaObjects: [
      { type: 'Organization', raw: { name: 'Marine Products' } },
    ],
    schemaParseErrors: 0,
    internalLinks: ['/collections/boat-parts', '/collections/wakeboards', '/contact'],
    externalLinks: ['https://slcboats.com', 'https://protectourlakelife.com', 'https://rebuyengine.com'],
    textContent: 'Marine Products is a Salt Lake City dealer for marine parts, wakeboards, water skis, surfers, and boating gear. Shop boat accessories, browse watersports inventory, and visit our Utah showroom.',
    wordCount: 600,
    lastModified: 'Tue, 10 Mar 2026 12:00:00 GMT',
    statusCode: 200,
    loadTimeMs: 120,
    classification: 'homepage',
    detectedPlatform: 'shopify',
  };

  const collectionPage = {
    url: 'https://marine-products.com/collections/boat-parts',
    title: 'Boat Parts | Marine Products',
    h1s: ['Boat Parts'],
    headings: [
      { level: 1, text: 'Boat Parts' },
      { level: 2, text: 'Marine Engine Parts' },
      { level: 2, text: 'Boat Accessories' },
    ],
    metaDescription: 'Boat parts and marine accessories for Utah boat owners.',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: ['https://slcboats.com', 'https://shopify.com'],
    textContent: 'Browse marine engine parts, wakeboard accessories, and boating gear for Salt Lake City and Utah customers.',
    wordCount: 300,
    statusCode: 200,
    loadTimeMs: 80,
    classification: 'service',
    detectedPlatform: 'shopify',
  };

  return createCrawlData({
    url: 'https://marine-products.com/',
    normalizedUrl: 'https://marine-products.com',
    detectedPlatform: 'shopify',
    homepage,
    pages: [homepage, collectionPage],
  });
}

function makePrompt(id = 'test-1', text = 'Tell me about Example Co', category = 'direct') {
  return { id, text, category, industry: 'Technology', location: undefined };
}

function makeEngineResponse(engine, prompt, text) {
  return { engine, prompt, text, testedAt: Date.now() };
}

// ─── fuzzyMatch ──────────────────────────────────────────────────────────────

test('fuzzyMatch finds exact brand inclusion', () => {
  assert.equal(fuzzyMatch('I recommend Example Co for SEO work.', 'Example Co'), true);
});

test('fuzzyMatch finds brand without punctuation', () => {
  assert.equal(fuzzyMatch('Check out exampleco for great tools', 'Example-Co'), true);
});

test('fuzzyMatch finds brand without spaces', () => {
  assert.equal(fuzzyMatch('exampleco is the best option', 'Example Co'), true);
});

test('fuzzyMatch returns false when brand is absent', () => {
  assert.equal(fuzzyMatch('Nothing relevant here.', 'Example Co'), false);
});

test('fuzzyMatch is case-insensitive', () => {
  assert.equal(fuzzyMatch('EXAMPLE CO is great', 'example co'), true);
});

// ─── analyzeResponse ─────────────────────────────────────────────────────────

test('analyzeResponse detects brand mention and positive sentiment', () => {
  const prompt = makePrompt();
  const response = makeEngineResponse(
    'chatgpt',
    prompt,
    'Example Co is an excellent and innovative platform for AI visibility. ' +
    'They are a leading provider with great results.'
  );

  const result = analyzeResponse(response, 'Example Co', 'example.com');

  assert.equal(result.mentioned, true);
  assert.equal(result.sentiment, 'positive');
  assert.equal(result.engine, 'chatgpt');
  assert.ok(result.position !== null);
});

test('analyzeResponse detects brand not mentioned', () => {
  const prompt = makePrompt();
  const response = makeEngineResponse(
    'chatgpt',
    prompt,
    'Here are the top AI tools: Semrush, Ahrefs, Moz, BrightEdge.'
  );

  const result = analyzeResponse(response, 'Example Co', 'example.com');

  assert.equal(result.mentioned, false);
  assert.equal(result.position, null);
  assert.equal(result.sentiment, null);
});

test('analyzeResponse detects negative sentiment', () => {
  const prompt = makePrompt();
  const response = makeEngineResponse(
    'chatgpt',
    prompt,
    'Example Co has been criticized for being outdated and unreliable. ' +
    'There are concerns about slow performance.'
  );

  const result = analyzeResponse(response, 'Example Co', 'example.com');

  assert.equal(result.mentioned, true);
  assert.equal(result.sentiment, 'negative');
});

test('analyzeResponse detects neutral sentiment when no signal words', () => {
  const prompt = makePrompt();
  const response = makeEngineResponse(
    'chatgpt',
    prompt,
    'Example Co is a company that does AI-related things.'
  );

  const result = analyzeResponse(response, 'Example Co', 'example.com');

  assert.equal(result.mentioned, true);
  assert.equal(result.sentiment, 'neutral');
});

test('analyzeResponse detects numbered list position', () => {
  const prompt = makePrompt('cat-1', 'Best AI companies', 'category');
  const response = makeEngineResponse(
    'chatgpt',
    prompt,
    'Top AI companies:\n1. Cognizo\n2. MarketMuse\n3. Example Co - Great platform\n4. BrightEdge'
  );

  const result = analyzeResponse(response, 'Example Co', 'example.com');

  assert.equal(result.mentioned, true);
  assert.equal(result.position, 3);
});

test('analyzeResponse extracts competitors from numbered list', () => {
  const prompt = makePrompt('cat-1', 'Best AI companies', 'category');
  const response = makeEngineResponse(
    'chatgpt',
    prompt,
    'Top platforms:\n1. Example Co - Great\n2. MarketMuse - Content AI\n3. BrightEdge - Enterprise SEO'
  );

  const result = analyzeResponse(response, 'Example Co', 'example.com');

  assert.equal(result.mentioned, true);
  assert.ok(result.competitors.length >= 2);
  assert.ok(result.competitors.some((c) => c.includes('MarketMuse')));
  assert.ok(result.competitors.some((c) => c.includes('BrightEdge')));
});

test('analyzeResponse truncates rawSnippet to 500 chars', () => {
  const longText = 'Example Co '.repeat(200);
  const prompt = makePrompt();
  const response = makeEngineResponse('chatgpt', prompt, longText);

  const result = analyzeResponse(response, 'Example Co', 'example.com');

  assert.ok(result.rawSnippet.length <= 500);
});

// ─── extractCitationUrls ─────────────────────────────────────────────────────

test('extractCitationUrls extracts markdown links', () => {
  const text = 'Check out [Example Co](https://example.com/about) for more.';
  const urls = extractCitationUrls(text, 'example.com', []);

  assert.equal(urls.length, 1);
  assert.equal(urls[0].domain, 'example.com');
  assert.equal(urls[0].anchorText, 'Example Co');
  assert.equal(urls[0].isOwnDomain, true);
});

test('extractCitationUrls extracts bare URLs', () => {
  const text = 'Visit https://semrush.com/tools for details.';
  const urls = extractCitationUrls(text, 'example.com', ['Semrush']);

  assert.equal(urls.length, 1);
  assert.equal(urls[0].domain, 'semrush.com');
  assert.equal(urls[0].isOwnDomain, false);
  assert.equal(urls[0].isCompetitor, true);
});

test('extractCitationUrls extracts footnote-style URLs', () => {
  const text = 'See reference [1]: https://example.com/docs for details.';
  const urls = extractCitationUrls(text, 'example.com', []);

  assert.ok(urls.length >= 1);
  assert.ok(urls.some((u) => u.domain === 'example.com'));
});

test('extractCitationUrls deduplicates URLs', () => {
  const text =
    'Visit [Example](https://example.com) and also https://example.com is great.';
  const urls = extractCitationUrls(text, 'example.com', []);

  assert.equal(urls.length, 1);
});

test('extractCitationUrls classifies own domain including subdomains', () => {
  const text = 'See https://docs.example.com/guide for help.';
  const urls = extractCitationUrls(text, 'example.com', []);

  assert.equal(urls.length, 1);
  assert.equal(urls[0].isOwnDomain, true);
});

test('extractCitationUrls merges provider-supplied citations and deduplicates them', () => {
  const text = 'See [Example Docs](https://example.com/docs) and https://competitor.com/research.';
  const urls = extractCitationUrls(text, 'example.com', ['Competitor'], [
    { url: 'https://example.com/docs', anchorText: null },
    { url: 'https://competitor.com/research', anchorText: 'Competitor research' },
    { url: 'https://thirdparty.com/article', anchorText: 'Third Party' },
  ]);

  assert.equal(urls.length, 3);
  assert.ok(urls.some((u) => u.domain === 'example.com' && u.isOwnDomain));
  assert.ok(urls.some((u) => u.domain === 'competitor.com' && u.isCompetitor));
  assert.ok(urls.some((u) => u.domain === 'thirdparty.com' && !u.isOwnDomain && !u.isCompetitor));
});

test('analyzeResponse merges explicit provider citations into normalized citationUrls', () => {
  const result = analyzeResponse({
    engine: 'perplexity',
    prompt: makePrompt(),
    text: 'Example Co is a strong option.',
    testedAt: Date.now(),
    citations: ['https://example.com/about'],
    searchResults: [{ url: 'https://competitor.com/compare', title: 'Competitor Compare' }],
  }, 'Example Co', 'example.com');

  assert.equal(result.citationPresent, true);
  assert.ok(result.citationUrls.some((u) => u.domain === 'example.com' && u.isOwnDomain));
  assert.ok(result.citationUrls.some((u) => u.domain === 'competitor.com'));
});

// ─── computeScore ────────────────────────────────────────────────────────────

test('computeScore returns 0 for empty results', () => {
  assert.equal(computeScore([]), 0);
});

test('computeScore gives max score for perfect mention', () => {
  const result = {
    mentioned: true,
    position: 1,
    sentiment: 'positive',
    citationPresent: true,
    citationUrls: [{ url: 'https://example.com', domain: 'example.com', anchorText: null, isOwnDomain: true, isCompetitor: false }],
    competitors: [],
    engine: 'chatgpt',
    prompt: makePrompt(),
    descriptionAccurate: true,
    rawSnippet: 'Example Co is excellent',
    testedAt: Date.now(),
  };

  const score = computeScore([result]);
  assert.equal(score, 100);
});

test('computeScore gives 0 for not-mentioned result', () => {
  const result = {
    mentioned: false,
    position: null,
    sentiment: null,
    citationPresent: false,
    citationUrls: [],
    competitors: [],
    engine: 'chatgpt',
    prompt: makePrompt(),
    descriptionAccurate: false,
    rawSnippet: 'No mention here',
    testedAt: Date.now(),
  };

  assert.equal(computeScore([result]), 0);
});

test('computeScore averages across multiple results', () => {
  const mentioned = {
    mentioned: true,
    position: 2,
    sentiment: 'positive',
    citationPresent: false,
    citationUrls: [],
    competitors: [],
    engine: 'chatgpt',
    prompt: makePrompt(),
    descriptionAccurate: true,
    rawSnippet: '',
    testedAt: Date.now(),
  };
  const notMentioned = {
    mentioned: false,
    position: null,
    sentiment: null,
    citationPresent: false,
    citationUrls: [],
    competitors: [],
    engine: 'chatgpt',
    prompt: makePrompt('p2'),
    descriptionAccurate: false,
    rawSnippet: '',
    testedAt: Date.now(),
  };

  const score = computeScore([mentioned, notMentioned]);
  // mentioned: 60 (base) + 15 (top 3) + 15 (positive) = 90 / 2 results = 45
  assert.equal(score, 45);
});

test('computeScore caps at 100', () => {
  const results = Array.from({ length: 3 }, () => ({
    mentioned: true,
    position: 1,
    sentiment: 'positive',
    citationPresent: true,
    citationUrls: [],
    competitors: [],
    engine: 'chatgpt',
    prompt: makePrompt(),
    descriptionAccurate: true,
    rawSnippet: '',
    testedAt: Date.now(),
  }));

  assert.equal(computeScore(results), 100);
});

test('computeScore awards 10 points for position 4-5', () => {
  const result = {
    mentioned: true,
    position: 4,
    sentiment: 'neutral',
    citationPresent: false,
    citationUrls: [],
    competitors: [],
    engine: 'chatgpt',
    prompt: makePrompt(),
    descriptionAccurate: true,
    rawSnippet: '',
    testedAt: Date.now(),
  };

  // 60 (base) + 10 (pos 4) + 5 (neutral) = 75
  assert.equal(computeScore([result]), 75);
});

// ─── Prompt Generator ────────────────────────────────────────────────────────

test('inferBusinessName uses og:site_name first', () => {
  const crawl = createCrawlData();
  assert.equal(inferBusinessName(crawl), 'Example Co');
});

test('inferBusinessName falls back to title before separator', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      ogTags: {},
      title: 'My Brand | Homepage',
    },
  });

  assert.equal(inferBusinessName(crawl), 'My Brand');
});

test('inferBusinessName falls back to hostname', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      ogTags: {},
      title: '',
    },
  });

  assert.equal(inferBusinessName(crawl), 'example.com');
});

test('inferIndustry detects AI & Machine Learning', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      metaDescription: 'We build artificial intelligence and machine learning solutions.',
      textContent: 'Our AI platform uses deep learning.',
    },
  });

  assert.equal(inferIndustry(crawl), 'AI & Machine Learning');
});

test('inferIndustry detects E-commerce', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      metaDescription: 'Shop the best products online',
      textContent: 'Add to cart and buy now!',
    },
  });

  assert.equal(inferIndustry(crawl), 'E-commerce');
});

test('inferIndustry defaults to Technology', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      metaDescription: 'We do things.',
      textContent: 'General company website.',
    },
  });

  assert.equal(inferIndustry(crawl), 'Technology');
});

test('inferIndustry detects Marine & Watersports', () => {
  const crawl = createMarineRetailCrawlData();
  assert.equal(inferIndustry(crawl), 'Marine & Watersports');
});

test('inferLocation detects major city names', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      textContent: 'Contact us at our Denver office for help.',
    },
  });

  assert.equal(inferLocation(crawl), 'Denver');
});

test('inferLocation detects city-state patterns', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      textContent: 'We serve businesses in Boulder, CO and surrounding areas.',
    },
  });

  assert.equal(inferLocation(crawl), 'Boulder');
});

test('inferLocation returns undefined when no location found', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      metaDescription: 'A global platform.',
      textContent: 'We serve customers worldwide.',
    },
  });

  assert.equal(inferLocation(crawl), undefined);
});

test('generatePrompts produces 15-25 prompts (min with backfill)', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      metaDescription: 'A platform for stuff.',
      textContent: 'We make things happen globally.',
    },
  });

  const prompts = generatePrompts(crawl);

  assert.ok(prompts.length >= 15, `Expected at least 15 prompts, got ${prompts.length}`);
  assert.ok(prompts.length <= 25, `Expected at most 25 prompts, got ${prompts.length}`);
  assert.ok(prompts.some((p) => p.category === 'direct'));
  assert.ok(prompts.some((p) => p.category === 'category'));
});

test('generatePrompts grounds marine retail prompts in boating categories', () => {
  const crawl = createMarineRetailCrawlData();
  const profile = buildBusinessProfile(crawl);
  const prompts = generatePrompts(crawl, profile);

  assert.equal(profile.vertical, 'marine_watersports');
  assert.ok(prompts.some((prompt) => /marine parts|watersports|wakeboard|boating/i.test(prompt.text)));
  assert.ok(!prompts.every((prompt) => /logistics|supply chain|warehouse|freight/i.test(prompt.text)));
});

test('generatePrompts produces 15-25 prompts with rich crawl data', () => {
  const crawl = createRichCrawlData();
  const prompts = generatePrompts(crawl);

  assert.ok(prompts.length >= 15, `Expected at least 15 prompts, got ${prompts.length}`);
  assert.ok(prompts.length <= 25, `Expected at most 25 prompts, got ${prompts.length}`);
  // Should have content-derived prompts
  assert.ok(prompts.some((p) => p.source && p.source !== 'core' && p.source !== 'backfill' && p.source !== 'fallback'),
    'Should have content-derived prompts beyond core/backfill/fallback');
});

test('generatePrompts includes brand name in direct prompts', () => {
  const crawl = createCrawlData();
  const prompts = generatePrompts(crawl);
  const directPrompts = prompts.filter((p) => p.category === 'direct');

  assert.ok(directPrompts.length >= 2);
  assert.ok(directPrompts.every((p) => p.text.includes('Example Co')));
});

test('generatePrompts sets source field on all prompts', () => {
  const crawl = createRichCrawlData();
  const prompts = generatePrompts(crawl);

  for (const p of prompts) {
    assert.ok(typeof p.source === 'string', `Prompt ${p.id} missing source field`);
    assert.ok(p.source.length > 0, `Prompt ${p.id} has empty source`);
  }
});

// ─── Content Extractor ───────────────────────────────────────────────────────

test('extractProducts finds JSON-LD Product schemas', () => {
  const crawl = createRichCrawlData();
  const products = extractProducts(crawl);

  assert.ok(products.length >= 2, `Expected at least 2 products, got ${products.length}`);
  assert.ok(products.some((p) => p.includes('AcmeBoard Pro')));
  assert.ok(products.some((p) => p.includes('AcmeSprint Tracker')));
});

test('extractProducts includes service page headings', () => {
  const crawl = createRichCrawlData();
  const products = extractProducts(crawl);

  assert.ok(products.some((p) => p.includes('Agile Board Management') || p.includes('Sprint Planning')),
    'Should include service page H2/H3 headings');
});

test('extractServices finds service page H2s', () => {
  const crawl = createRichCrawlData();
  const services = extractServices(crawl);

  assert.ok(services.length >= 1, `Expected at least 1 service, got ${services.length}`);
  assert.ok(services.some((s) => s.includes('Agile Board Management') || s.includes('Sprint Planning')));
});

test('extractFeatures finds feature-related headings', () => {
  const crawl = createRichCrawlData();
  const features = extractFeatures(crawl);

  assert.ok(features.length >= 1, `Expected at least 1 feature, got ${features.length}`);
  assert.ok(features.some((f) => f.toLowerCase().includes('feature') || f.toLowerCase().includes('capability')));
});

test('extractCompetitors filters out social/CDN domains', () => {
  const crawl = createRichCrawlData();
  const competitors = extractCompetitors(crawl);

  // twitter.com should be filtered out
  assert.ok(!competitors.some((c) => c.toLowerCase().includes('twitter')),
    'Should not include social media domains as competitors');
  // competitor-one.com should remain
  assert.ok(competitors.length >= 1, 'Should find at least one competitor from external links');
});

test('extractUSPs finds superlative phrases', () => {
  const crawl = createRichCrawlData();
  const usps = extractUSPs(crawl);

  assert.ok(usps.length >= 1, `Expected at least 1 USP, got ${usps.length}`);
  assert.ok(usps.some((u) => u.includes('#1')), 'Should find "#1" superlative');
});

test('extractFAQQueries finds JSON-LD FAQ questions', () => {
  const crawl = createRichCrawlData();
  const faqs = extractFAQQueries(crawl);

  assert.ok(faqs.length >= 2, `Expected at least 2 FAQ queries, got ${faqs.length}`);
  assert.ok(faqs.some((f) => f.includes('data security')));
  assert.ok(faqs.some((f) => f.includes('Pro and Enterprise')));
});

test('extractFAQQueries finds question-style headings', () => {
  const crawl = createRichCrawlData();
  const faqs = extractFAQQueries(crawl);

  assert.ok(faqs.some((f) => f.includes('?')), 'Should find question-phrased headings');
});

test('extractBlogTopics finds Article schema headlines', () => {
  const crawl = createRichCrawlData();
  const topics = extractBlogTopics(crawl);

  assert.ok(topics.length >= 1, `Expected at least 1 blog topic, got ${topics.length}`);
  assert.ok(topics.some((t) => t.includes('Agile Best Practices')));
});

test('extractGeoAreas finds city mentions', () => {
  const crawl = createRichCrawlData();
  const areas = extractGeoAreas(crawl);

  assert.ok(areas.length >= 1, `Expected at least 1 geo area, got ${areas.length}`);
  assert.ok(areas.some((a) => a.includes('Denver')));
});

test('extractPricingTiers finds pricing page headings', () => {
  const crawl = createRichCrawlData();
  const tiers = extractPricingTiers(crawl);

  assert.ok(tiers.length >= 2, `Expected at least 2 pricing tiers, got ${tiers.length}`);
  assert.ok(tiers.some((t) => t.toLowerCase().includes('free')));
  assert.ok(tiers.some((t) => t.toLowerCase().includes('pro')));
});

test('extractTargetAudience finds audience patterns', () => {
  const crawl = createRichCrawlData();
  const audiences = extractTargetAudience(crawl);

  assert.ok(audiences.length >= 1, `Expected at least 1 audience, got ${audiences.length}`);
});

test('extractIndustryTerms finds multi-word meta keywords', () => {
  const crawl = createRichCrawlData();
  const terms = extractIndustryTerms(crawl);

  assert.ok(terms.length >= 1, `Expected at least 1 industry term, got ${terms.length}`);
  assert.ok(terms.some((t) => t.includes('project management') || t.includes('task tracking')));
});

test('extractSiteContent returns complete profile with all 15 fields', () => {
  const crawl = createRichCrawlData();
  const profile = extractSiteContent(crawl);

  assert.ok(Array.isArray(profile.products));
  assert.ok(Array.isArray(profile.services));
  assert.ok(Array.isArray(profile.features));
  assert.ok(Array.isArray(profile.usps));
  assert.ok(Array.isArray(profile.competitors));
  assert.ok(Array.isArray(profile.targetAudience));
  assert.ok(Array.isArray(profile.geoAreas));
  assert.ok(Array.isArray(profile.pricingTiers));
  assert.ok(Array.isArray(profile.faqQueries));
  assert.ok(Array.isArray(profile.industryTerms));
  assert.ok(Array.isArray(profile.blogTopics));
  assert.ok(Array.isArray(profile.useCases));
  assert.ok(Array.isArray(profile.problemStatements));
  assert.ok(Array.isArray(profile.integrations));
  assert.ok(Array.isArray(profile.actionCapabilities));
});

test('extractSiteContent returns empty arrays for minimal crawl data', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      metaDescription: 'Simple site.',
      textContent: 'Nothing special here.',
      schemaObjects: [],
      externalLinks: [],
      metaKeywords: [],
    },
  });
  const profile = extractSiteContent(crawl);

  // All should be arrays (possibly empty)
  for (const key of Object.keys(profile)) {
    assert.ok(Array.isArray(profile[key]), `${key} should be an array`);
  }
});

// ─── testAllEngines ──────────────────────────────────────────────────────────

test('testAllEngines runs all available engines with all prompts', async () => {
  const prompts = [makePrompt('p1', 'Tell me about X'), makePrompt('p2', 'What does X do?')];

  const results = await testAllEngines(mockMentionTester, prompts);

  // Mock tester returns 4 engines × 2 prompts = 8 results
  assert.equal(results.length, 8);
  assert.ok(results.some((r) => r.engine === 'chatgpt'));
  assert.ok(results.some((r) => r.engine === 'claude'));
  assert.ok(results.some((r) => r.engine === 'gemini'));
  assert.ok(results.some((r) => r.engine === 'perplexity'));
});

test('testAllEngines handles engine failures gracefully', async () => {
  let callCount = 0;
  const flakeyTester = {
    async query(engine, prompt) {
      callCount++;
      if (engine === 'chatgpt') throw new Error('API down');
      return {
        engine,
        prompt,
        text: 'Some response',
        testedAt: Date.now(),
      };
    },
    availableEngines() {
      return ['chatgpt', 'claude'];
    },
  };

  const results = await testAllEngines(flakeyTester, [makePrompt()]);

  // Only claude should succeed
  assert.equal(results.length, 1);
  assert.equal(results[0].engine, 'claude');
});

test('testAllEngines returns empty array when no engines available', async () => {
  const emptyTester = {
    query() { return Promise.resolve({ engine: 'chatgpt', prompt: makePrompt(), text: '', testedAt: 0 }); },
    availableEngines() { return []; },
  };

  const results = await testAllEngines(emptyTester, [makePrompt()]);
  assert.equal(results.length, 0);
});

// ─── Mock Mention Tester ─────────────────────────────────────────────────────

test('mockMentionTester returns all 4 engines', () => {
  const engines = mockMentionTester.availableEngines();

  assert.equal(engines.length, 4);
  assert.deepEqual(engines, ['chatgpt', 'perplexity', 'gemini', 'claude']);
});

test('mockMentionTester returns valid EngineResponse', async () => {
  const prompt = makePrompt();
  const response = await mockMentionTester.query('chatgpt', prompt);

  assert.equal(response.engine, 'chatgpt');
  assert.equal(response.prompt, prompt);
  assert.ok(typeof response.text === 'string');
  assert.ok(response.text.length > 0);
  assert.ok(typeof response.testedAt === 'number');
});

test('mockMentionTester uses category-specific templates', async () => {
  const directPrompt = makePrompt('d1', 'Tell me about SomeBrand', 'direct');
  const catPrompt = makePrompt('c1', 'Best tools', 'category');

  const directResponse = await mockMentionTester.query('chatgpt', directPrompt);
  const catResponse = await mockMentionTester.query('chatgpt', catPrompt);

  // Both should return non-empty text (category-specific templates)
  assert.ok(directResponse.text.length > 0);
  assert.ok(catResponse.text.length > 0);
});

// ─── Real Mention Tester — availability ──────────────────────────────────────

test('realMentionTester.availableEngines filters by env keys', () => {
  const engines = realMentionTester.availableEngines();

  // Only engines with configured API keys should appear
  for (const engine of engines) {
    const keyMap = { chatgpt: 'OPENAI_API_KEY', claude: 'ANTHROPIC_API_KEY', gemini: 'GOOGLE_GENAI_API_KEY', perplexity: 'PERPLEXITY_API_KEY' };
    assert.ok(process.env[keyMap[engine]], `${engine} listed but ${keyMap[engine]} not set`);
  }
});

test('canUseMentionTester returns true when OPENAI_API_KEY is set', () => {
  if (process.env.OPENAI_API_KEY) {
    assert.equal(canUseMentionTester(), true);
  }
});

// ─── End-to-end: runMentionTests with mock ───────────────────────────────────

test('runMentionTests returns complete MentionSummary with mock tester', async () => {
  const crawl = createCrawlData();
  const summary = await runMentionTests(crawl, mockMentionTester);

  // Structure checks
  assert.ok(typeof summary.overallScore === 'number');
  assert.ok(summary.overallScore >= 0 && summary.overallScore <= 100);
  assert.ok(typeof summary.testedAt === 'number');
  assert.ok(Array.isArray(summary.results));
  assert.ok(Array.isArray(summary.promptsUsed));
  assert.ok(Array.isArray(summary.competitorsMentioned));

  // Engine breakdown checks
  const engines = ['chatgpt', 'perplexity', 'gemini', 'claude'];
  for (const engine of engines) {
    const breakdown = summary.engineBreakdown[engine];
    assert.ok(breakdown, `Missing breakdown for ${engine}`);
    assert.ok(typeof breakdown.mentioned === 'number');
    assert.ok(typeof breakdown.total === 'number');
    assert.ok(breakdown.total > 0, `${engine} has 0 total results`);
    assert.ok(['positive', 'neutral', 'negative', 'not-found'].includes(breakdown.sentiment));
  }

  // Prompts should be 15-25, results should be 4 engines × prompts
  assert.ok(summary.promptsUsed.length >= 15, `Expected at least 15 prompts, got ${summary.promptsUsed.length}`);
  assert.ok(summary.promptsUsed.length <= 25, `Expected at most 25 prompts, got ${summary.promptsUsed.length}`);
  assert.equal(summary.results.length, summary.promptsUsed.length * 4);
});

test('runMentionTests produces results with correct engines', async () => {
  const crawl = createCrawlData();
  const summary = await runMentionTests(crawl, mockMentionTester);

  const enginesSeen = new Set(summary.results.map((r) => r.engine));
  assert.ok(enginesSeen.has('chatgpt'));
  assert.ok(enginesSeen.has('claude'));
  assert.ok(enginesSeen.has('gemini'));
  assert.ok(enginesSeen.has('perplexity'));
});

test('runMentionTests competitorsMentioned is sorted by count descending', async () => {
  const crawl = createCrawlData();
  const summary = await runMentionTests(crawl, mockMentionTester);

  for (let i = 1; i < summary.competitorsMentioned.length; i++) {
    assert.ok(
      summary.competitorsMentioned[i].count <= summary.competitorsMentioned[i - 1].count,
      'Competitors should be sorted by count descending'
    );
  }
});

test('runMentionTests engine breakdown totals match result count per engine', async () => {
  const crawl = createCrawlData();
  const summary = await runMentionTests(crawl, mockMentionTester);

  for (const engine of ['chatgpt', 'perplexity', 'gemini', 'claude']) {
    const resultsForEngine = summary.results.filter((r) => r.engine === engine);
    assert.equal(
      summary.engineBreakdown[engine].total,
      resultsForEngine.length,
      `${engine} breakdown total doesn't match results count`
    );
    assert.equal(
      summary.engineBreakdown[engine].mentioned,
      resultsForEngine.filter((r) => r.mentioned).length,
      `${engine} breakdown mentioned count is wrong`
    );
  }
});

// ─── Live ChatGPT Integration Test ──────────────────────────────────────────
// Only runs when OPENAI_API_KEY is set. Tests real API connectivity.

test('LIVE: ChatGPT real API query returns a response', { skip: !process.env.OPENAI_API_KEY }, async () => {
  const prompt = makePrompt('live-1', 'What is artificial intelligence?');
  const response = await realMentionTester.query('chatgpt', prompt);

  assert.equal(response.engine, 'chatgpt');
  assert.equal(response.prompt, prompt);
  assert.ok(typeof response.text === 'string');
  assert.ok(response.text.length > 50, `Response too short: "${response.text.slice(0, 100)}"`);
  assert.ok(typeof response.testedAt === 'number');
});

test('LIVE: ChatGPT mention analysis works end-to-end', { skip: !process.env.OPENAI_API_KEY }, async () => {
  const prompt = makePrompt('live-2', 'Tell me about OpenAI');
  const response = await realMentionTester.query('chatgpt', prompt);
  const result = analyzeResponse(response, 'OpenAI', 'openai.com');

  assert.equal(result.engine, 'chatgpt');
  // OpenAI should definitely be mentioned when you ask ChatGPT about OpenAI
  assert.equal(result.mentioned, true, `Expected "OpenAI" to be mentioned in: "${response.text.slice(0, 200)}"`);
  assert.ok(result.position !== null);
  assert.ok(result.sentiment !== null);
  assert.ok(['positive', 'neutral', 'negative'].includes(result.sentiment));
});

test('LIVE: Full mention test pipeline with ChatGPT-only tester', { skip: !process.env.OPENAI_API_KEY }, async () => {
  // Build a tester that only uses ChatGPT (to avoid needing other API keys)
  const chatgptOnlyTester = {
    query: (engine, prompt) => realMentionTester.query(engine, prompt),
    availableEngines: () => ['chatgpt'],
  };

  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      ogTags: { 'og:site_name': 'Google' },
      title: 'Google',
      textContent: 'Google is a technology company specializing in search.',
      metaDescription: 'Google search engine.',
    },
    url: 'https://google.com/',
    normalizedUrl: 'https://google.com',
  });

  const summary = await runMentionTests(crawl, chatgptOnlyTester);

  assert.ok(typeof summary.overallScore === 'number');
  assert.ok(summary.overallScore >= 0 && summary.overallScore <= 100);
  assert.ok(summary.promptsUsed.length >= 15, `Expected at least 15 prompts, got ${summary.promptsUsed.length}`);
  assert.ok(summary.promptsUsed.length <= 25, `Expected at most 25 prompts, got ${summary.promptsUsed.length}`);
  assert.ok(summary.results.length > 0);

  // All results should be from chatgpt
  assert.ok(summary.results.every((r) => r.engine === 'chatgpt'));

  // Google is well-known, should be mentioned by ChatGPT in most prompts
  const mentionedCount = summary.results.filter((r) => r.mentioned).length;
  assert.ok(mentionedCount >= 1, `Expected at least 1 mention for Google, got ${mentionedCount}`);

  // Engine breakdown should have chatgpt populated, others at 0
  assert.ok(summary.engineBreakdown.chatgpt.total > 0);
  assert.equal(summary.engineBreakdown.perplexity.total, 0);
  assert.equal(summary.engineBreakdown.gemini.total, 0);
  assert.equal(summary.engineBreakdown.claude.total, 0);

  console.log(`  ChatGPT live results: ${mentionedCount}/${summary.results.length} mentions, score: ${summary.overallScore}`);
});

// ─── Brand propagation regression test ──────────────────────────────────────

test('generatePrompts sets brand field on all prompts', () => {
  const crawl = createCrawlData();
  const prompts = generatePrompts(crawl);
  const brand = inferBusinessName(crawl);

  for (const p of prompts) {
    assert.equal(p.brand, brand, `Prompt ${p.id} missing brand field`);
  }
});

test('runMentionTests produces non-zero score with mock tester', async () => {
  const crawl = createCrawlData();
  const summary = await runMentionTests(crawl, mockMentionTester);

  // With brand properly propagated to all prompts, the mock templates
  // insert the real brand name, so fuzzyMatch should find it in most responses.
  const mentionedCount = summary.results.filter((r) => r.mentioned).length;
  assert.ok(
    mentionedCount > 0,
    `Expected at least 1 mention, got 0 out of ${summary.results.length}`
  );
  assert.ok(
    summary.overallScore > 0,
    `Expected non-zero score, got ${summary.overallScore}`
  );
});

// ─── computeShareOfVoice ────────────────────────────────────────────────────

test('computeShareOfVoice calculates correct SOV', () => {
  const results = [
    { engine: 'chatgpt', mentioned: true, competitors: ['Cognizo', 'MarketMuse'], prompt: makePrompt(), rawSnippet: '', position: 1, sentiment: 'positive', citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
    { engine: 'chatgpt', mentioned: false, competitors: ['Cognizo'], prompt: makePrompt('p2'), rawSnippet: '', position: null, sentiment: null, citationPresent: false, citationUrls: [], descriptionAccurate: false, testedAt: Date.now() },
    { engine: 'perplexity', mentioned: true, competitors: [], prompt: makePrompt(), rawSnippet: '', position: 1, sentiment: 'positive', citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
  ];

  const sov = computeShareOfVoice(results, 'Example Co');

  assert.equal(sov.brandMentions, 2);
  assert.equal(sov.totalMentions, 5); // 2 brand + 3 competitors
  assert.equal(sov.shareOfVoicePct, 40); // 2/5 = 40%

  // chatgpt: 1 brand + 3 comps = 4 total, sovPct = 25%
  assert.equal(sov.byEngine.chatgpt.brandMentions, 1);
  assert.equal(sov.byEngine.chatgpt.totalMentions, 4);
  assert.equal(sov.byEngine.chatgpt.sovPct, 25);

  // perplexity: 1 brand + 0 comps = 1 total, sovPct = 100%
  assert.equal(sov.byEngine.perplexity.brandMentions, 1);
  assert.equal(sov.byEngine.perplexity.sovPct, 100);
});

test('computeShareOfVoice returns 0 for empty results', () => {
  const sov = computeShareOfVoice([], 'Example Co');
  assert.equal(sov.shareOfVoicePct, 0);
  assert.equal(sov.brandMentions, 0);
});

// ─── computeSentimentSummary ────────────────────────────────────────────────

test('computeSentimentSummary extracts positives and negatives', () => {
  const results = [
    { engine: 'chatgpt', mentioned: true, sentiment: 'positive', rawSnippet: 'Example Co is an excellent platform with innovative features.', competitors: [], prompt: makePrompt(), position: 1, citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
    { engine: 'perplexity', mentioned: true, sentiment: 'negative', rawSnippet: 'Example Co is outdated and unreliable for modern needs.', competitors: [], prompt: makePrompt(), position: 1, citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
    { engine: 'gemini', mentioned: true, sentiment: 'positive', rawSnippet: 'Example Co is a trusted leader in the space.', competitors: [], prompt: makePrompt(), position: 1, citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
  ];

  const summary = computeSentimentSummary(results);

  assert.equal(summary.overallSentiment, 'positive');
  assert.ok(summary.positiveScore > 50);
  assert.ok(summary.positives.length > 0, 'Should extract positive bullets');
  assert.ok(summary.negatives.length > 0, 'Should extract negative bullets');
});

test('computeSentimentSummary removes markdown-heavy fragments and falls back to polished prose', () => {
  const results = [
    {
      engine: 'chatgpt',
      mentioned: true,
      sentiment: 'positive',
      rawSnippet:
        'Some of the leading dealers of wakeboards and related products include: 1. Breach** - Known for quality watersports gear. ### For Powerboats, PWCs (Jet Skis), and Tow Sports Boats.',
      competitors: [],
      prompt: makePrompt(),
      position: 1,
      citationPresent: false,
      citationUrls: [],
      descriptionAccurate: true,
      testedAt: Date.now(),
    },
  ];

  const summary = computeSentimentSummary(results, 'marine-products.com');

  assert.equal(summary.positives.length, 1);
  assert.match(summary.positives[0], /Marine Products is generally described positively/i);
  assert.doesNotMatch(summary.positives[0], /###|\*\*|1\./);
});

test('computeSentimentSummary keeps brand-specific complete sentences when available', () => {
  const results = [
    {
      engine: 'chatgpt',
      mentioned: true,
      sentiment: 'positive',
      rawSnippet:
        'Marine Products is a trusted dealer for wakeboards, boat parts, and watersports gear. 1. Breach** - Known for quality watersports gear.',
      competitors: [],
      prompt: makePrompt(),
      position: 1,
      citationPresent: false,
      citationUrls: [],
      descriptionAccurate: true,
      testedAt: Date.now(),
    },
  ];

  const summary = computeSentimentSummary(results, 'marine-products.com');

  assert.deepEqual(summary.positives, [
    'Marine Products is a trusted dealer for wakeboards, boat parts, and watersports gear.',
  ]);
});

test('computeSentimentSummary handles no mentions', () => {
  const results = [
    { engine: 'chatgpt', mentioned: false, sentiment: null, rawSnippet: 'No brand here.', competitors: [], prompt: makePrompt(), position: null, citationPresent: false, citationUrls: [], descriptionAccurate: false, testedAt: Date.now() },
  ];

  const summary = computeSentimentSummary(results);
  assert.equal(summary.positiveScore, 50);
  assert.equal(summary.overallSentiment, 'neutral');
});

// ─── computeTopicPerformance ────────────────────────────────────────────────

test('computeTopicPerformance groups by topic correctly', () => {
  const prompts = [
    { id: 'p1', text: 'Tell me about X', category: 'direct', industry: 'Technology', topic: 'Brand Awareness' },
    { id: 'p2', text: 'Best tech tools', category: 'category', industry: 'Technology', topic: 'Technology Tools' },
  ];

  const results = [
    { engine: 'chatgpt', mentioned: true, competitors: ['Comp1'], prompt: prompts[0], rawSnippet: '', position: 1, sentiment: 'positive', citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
    { engine: 'chatgpt', mentioned: false, competitors: ['Comp1', 'Comp2'], prompt: prompts[1], rawSnippet: '', position: null, sentiment: null, citationPresent: false, citationUrls: [], descriptionAccurate: false, testedAt: Date.now() },
  ];

  const topics = computeTopicPerformance(results, prompts);

  assert.equal(topics.length, 2);

  const brandAwareness = topics.find((t) => t.topic === 'Brand Awareness');
  assert.ok(brandAwareness);
  assert.equal(brandAwareness.visibilityPct, 100); // 1/1 mentioned

  const techTools = topics.find((t) => t.topic === 'Technology Tools');
  assert.ok(techTools);
  assert.equal(techTools.visibilityPct, 0); // 0/1 mentioned
});

// ─── computeCompetitorLeaderboard ───────────────────────────────────────────

test('computeCompetitorLeaderboard ranks competitors correctly', () => {
  const prompts = [
    makePrompt('p1', 'Q1'),
    makePrompt('p2', 'Q2'),
    makePrompt('p3', 'Q3'),
  ];

  const results = [
    { engine: 'chatgpt', mentioned: true, competitors: ['Cognizo', 'MarketMuse'], prompt: prompts[0], rawSnippet: '1. Cognizo\n2. MarketMuse', position: 1, sentiment: 'positive', citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
    { engine: 'chatgpt', mentioned: true, competitors: ['Cognizo'], prompt: prompts[1], rawSnippet: '1. Cognizo', position: 1, sentiment: 'positive', citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
    { engine: 'perplexity', mentioned: true, competitors: ['MarketMuse'], prompt: prompts[2], rawSnippet: '1. MarketMuse', position: 2, sentiment: 'neutral', citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
  ];

  const leaderboard = computeCompetitorLeaderboard(results, prompts);

  assert.ok(leaderboard.length >= 2);
  // Cognizo appears in 2 prompts, MarketMuse in 2 prompts
  assert.ok(leaderboard[0].visibilityPct >= leaderboard[1].visibilityPct, 'Should be sorted by visibility desc');
});

test('computeCompetitorLeaderboard filters generic platforms and weak one-off mentions', () => {
  const prompts = [
    { ...makePrompt('p1', 'Best marine suppliers', 'category'), category: 'category' },
    { ...makePrompt('p2', 'Compare marine suppliers', 'comparison'), category: 'comparison' },
    { ...makePrompt('p3', 'How do I ship marine parts?', 'workflow'), category: 'workflow' },
  ];

  const results = [
    { engine: 'chatgpt', mentioned: true, competitors: ['Blue Ocean Marine', 'Shopify'], prompt: prompts[0], rawSnippet: '1. Blue Ocean Marine\n2. Shopify', position: 1, sentiment: 'positive', citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
    { engine: 'perplexity', mentioned: true, competitors: ['Blue Ocean Marine', 'Shopify'], prompt: prompts[1], rawSnippet: '1. Blue Ocean Marine\n2. Shopify', position: 1, sentiment: 'positive', citationPresent: false, citationUrls: [], descriptionAccurate: true, testedAt: Date.now() },
    { engine: 'chatgpt', mentioned: false, competitors: ['Cloud'], prompt: prompts[2], rawSnippet: '1. Cloud', position: null, sentiment: null, citationPresent: false, citationUrls: [], descriptionAccurate: false, testedAt: Date.now() },
  ];

  const leaderboard = computeCompetitorLeaderboard(results, prompts);

  assert.ok(leaderboard.some((entry) => entry.name === 'Blue Ocean Marine'));
  assert.ok(!leaderboard.some((entry) => entry.name === 'Shopify'));
  assert.ok(!leaderboard.some((entry) => entry.name === 'Cloud'));
});

// ─── runMentionTests returns new fields ─────────────────────────────────────

test('runMentionTests returns new enhanced fields in MentionSummary', async () => {
  const crawl = createCrawlData();
  const summary = await runMentionTests(crawl, mockMentionTester);

  // New fields should be present
  assert.ok(typeof summary.visibilityPct === 'number', 'visibilityPct should be a number');
  assert.ok(summary.visibilityPct >= 0 && summary.visibilityPct <= 100, 'visibilityPct should be 0-100');

  assert.ok(summary.shareOfVoice, 'shareOfVoice should be present');
  assert.ok(typeof summary.shareOfVoice.shareOfVoicePct === 'number', 'shareOfVoicePct should be a number');
  assert.ok(typeof summary.shareOfVoice.brandMentions === 'number');
  assert.ok(typeof summary.shareOfVoice.totalMentions === 'number');
  assert.ok(summary.shareOfVoice.byEngine.chatgpt, 'byEngine should have chatgpt');

  assert.ok(summary.sentimentSummary, 'sentimentSummary should be present');
  assert.ok(['positive', 'neutral', 'negative'].includes(summary.sentimentSummary.overallSentiment));
  assert.ok(typeof summary.sentimentSummary.positiveScore === 'number');
  assert.ok(Array.isArray(summary.sentimentSummary.positives));
  assert.ok(Array.isArray(summary.sentimentSummary.negatives));

  assert.ok(Array.isArray(summary.topicPerformance), 'topicPerformance should be an array');
  assert.ok(summary.topicPerformance.length > 0, 'topicPerformance should have entries');
  for (const tp of summary.topicPerformance) {
    assert.ok(typeof tp.topic === 'string');
    assert.ok(typeof tp.visibilityPct === 'number');
    assert.ok(typeof tp.shareOfVoice === 'number');
    assert.ok(Array.isArray(tp.topBrands));
    assert.ok(typeof tp.promptCount === 'number');
  }

  assert.ok(Array.isArray(summary.competitorLeaderboard), 'competitorLeaderboard should be an array');
  for (const cl of summary.competitorLeaderboard) {
    assert.ok(typeof cl.name === 'string');
    assert.ok(typeof cl.count === 'number');
    assert.ok(typeof cl.visibilityPct === 'number');
  }

  assert.ok(Array.isArray(summary.inferredCompetitors), 'inferredCompetitors should be an array');
});

test('runMentionTests infers competitor candidates from the scanned site', async () => {
  const crawl = createMarineRetailCrawlData();
  crawl.homepage.externalLinks = ['https://blueoceanmarine.com', 'https://shopify.com'];
  crawl.pages[0].externalLinks = ['https://blueoceanmarine.com', 'https://shopify.com'];
  crawl.homepage.textContent = 'Marine Products provides marine supplies, boat parts, wakeboards, and boating gear for Salt Lake City customers.';

  const simpleTester = {
    availableEngines: () => ['chatgpt'],
    query: async (engine, prompt) => ({
      engine,
      prompt,
      text: 'Marine Products is a supplier for marine parts.',
      testedAt: Date.now(),
    }),
  };

  const summary = await runMentionTests(crawl, simpleTester);

  assert.ok(summary.competitorDiscovery.candidates.some((entry) => entry.name === 'Blueoceanmarine'));
  assert.ok(!summary.competitorDiscovery.candidates.some((entry) => entry.name === 'Shopify'));
  assert.ok(!summary.inferredCompetitors.some((entry) => entry.name === 'Shopify'));
  assert.ok(!summary.competitorLeaderboard.some((entry) => entry.name === 'Shopify'));
});

test('discoverCompetitors rejects wrong-industry, vendor, and UI-text candidates for marine retail', () => {
  const crawl = createMarineRetailCrawlData();
  const profile = buildBusinessProfile(crawl);
  const prompts = generatePrompts(crawl, profile);
  const results = [
    {
      engine: 'chatgpt',
      mentioned: true,
      competitors: ['C.H. Robinson', 'Mission and Vision', 'Rebuyengine', 'SLC Boats'],
      prompt: { ...prompts[0], id: 'p1', text: 'Best marine parts stores in Salt Lake City', category: 'comparison', source: 'competitor' },
      rawSnippet: '1. SLC Boats\n2. C.H. Robinson\n3. Mission and Vision',
      position: 1,
      sentiment: 'positive',
      citationPresent: false,
      citationUrls: [],
      descriptionAccurate: true,
      testedAt: Date.now(),
    },
    {
      engine: 'perplexity',
      mentioned: true,
      competitors: ['SLC Boats', 'DHL Supply Chain', 'Customer Satisfaction'],
      prompt: { ...prompts[1], id: 'p2', text: 'What are the top wakeboard and watersports retailers near Salt Lake City?', category: 'comparison', source: 'competitor' },
      rawSnippet: '1. SLC Boats\n2. DHL Supply Chain',
      position: 1,
      sentiment: 'positive',
      citationPresent: false,
      citationUrls: [],
      descriptionAccurate: true,
      testedAt: Date.now(),
    },
  ];

  const discovery = discoverCompetitors(crawl, prompts, results, profile);

  assert.ok(discovery.acceptedCompetitors.some((entry) => entry.name === 'SLC Boats' || entry.name === 'Slcboats'));
  assert.ok(!discovery.acceptedCompetitors.some((entry) => entry.name === 'C.H. Robinson'));
  assert.ok(!discovery.acceptedCompetitors.some((entry) => entry.name === 'DHL Supply Chain'));
  assert.ok(!discovery.acceptedCompetitors.some((entry) => entry.name === 'Mission and Vision'));
  assert.ok(!discovery.acceptedCompetitors.some((entry) => entry.name === 'Protectourlakelife'));
  assert.ok(discovery.rejectedCandidates.some((entry) => entry.name === 'Rebuyengine' && entry.reason === 'vendor_or_app'));
});

// ─── Topic field on prompts ─────────────────────────────────────────────────

test('generatePrompts sets topic field on all prompts', () => {
  const crawl = createCrawlData();
  const prompts = generatePrompts(crawl);

  for (const p of prompts) {
    assert.ok(typeof p.topic === 'string', `Prompt ${p.id} missing topic field`);
    assert.ok(p.topic.length > 0, `Prompt ${p.id} has empty topic`);
  }
});

// ─── Rich crawl data end-to-end ─────────────────────────────────────────────

test('runMentionTests with rich crawl data produces content-aware prompts', async () => {
  const crawl = createRichCrawlData();
  const summary = await runMentionTests(crawl, mockMentionTester);

  assert.ok(summary.promptsUsed.length >= 15, `Expected at least 15 prompts, got ${summary.promptsUsed.length}`);
  assert.ok(summary.promptsUsed.length <= 25, `Expected at most 25 prompts, got ${summary.promptsUsed.length}`);

  // Should have diverse sources
  const sources = new Set(summary.promptsUsed.map((p) => p.source).filter(Boolean));
  assert.ok(sources.size >= 3, `Expected at least 3 different prompt sources, got ${sources.size}: ${[...sources].join(', ')}`);

  // Should still produce valid results
  assert.ok(typeof summary.overallScore === 'number');
  assert.ok(summary.results.length === summary.promptsUsed.length * 4);
});

// ─── New Content Extractors ─────────────────────────────────────────────────

test('extractUseCases finds "helps teams" patterns', () => {
  const crawl = createRichCrawlData();
  const useCases = extractUseCases(crawl);

  assert.ok(useCases.length >= 1, `Expected at least 1 use case, got ${useCases.length}`);
  assert.ok(useCases.some((u) => u.toLowerCase().includes('automate') || u.toLowerCase().includes('track') || u.toLowerCase().includes('sprint')),
    `Expected use case about automation/tracking, got: ${useCases.join(', ')}`);
});

test('extractUseCases finds "designed for" patterns', () => {
  const hp = {
    ...createCrawlData().homepage,
    textContent: 'Designed to automate postgame reports. Built for converting voice recaps into feedback.',
  };
  const crawl = createCrawlData({ homepage: hp, pages: [hp] });
  const useCases = extractUseCases(crawl);

  assert.ok(useCases.length >= 1, `Expected at least 1 use case, got ${useCases.length}`);
});

test('extractProblemStatements finds problem patterns', () => {
  const crawl = createRichCrawlData();
  const problems = extractProblemStatements(crawl);

  assert.ok(problems.length >= 1, `Expected at least 1 problem statement, got ${problems.length}`);
  assert.ok(problems.some((p) => p.toLowerCase().includes('manual') || p.toLowerCase().includes('meeting') || p.toLowerCase().includes('wasted')),
    `Expected problem about manual/wasted, got: ${problems.join(', ')}`);
});

test('extractProblemStatements finds "tired of" patterns', () => {
  const hp = {
    ...createCrawlData().homepage,
    textContent: 'Tired of manually creating reports. Struggling with data entry errors.',
  };
  const crawl = createCrawlData({ homepage: hp, pages: [hp] });
  const problems = extractProblemStatements(crawl);

  assert.ok(problems.length >= 1, `Expected at least 1 problem, got ${problems.length}`);
});

test('extractIntegrations finds integration mentions', () => {
  const crawl = createRichCrawlData();
  const integrations = extractIntegrations(crawl);

  assert.ok(integrations.length >= 1, `Expected at least 1 integration, got ${integrations.length}`);
  assert.ok(integrations.some((i) => i === 'Slack' || i === 'Jira'),
    `Expected Slack or Jira, got: ${integrations.join(', ')}`);
});

test('extractIntegrations finds known platform names', () => {
  const hp = {
    ...createCrawlData().homepage,
    textContent: 'We work with Salesforce and HubSpot. Connects to Zapier for automation.',
  };
  const crawl = createCrawlData({ homepage: hp, pages: [hp] });
  const integrations = extractIntegrations(crawl);

  assert.ok(integrations.length >= 2, `Expected at least 2 integrations, got ${integrations.length}`);
});

test('extractActionCapabilities finds action phrases', () => {
  const crawl = createRichCrawlData();
  const capabilities = extractActionCapabilities(crawl);

  assert.ok(capabilities.length >= 1, `Expected at least 1 capability, got ${capabilities.length}`);
  assert.ok(capabilities.some((c) => /automate|generate|track|streamline|share/i.test(c)),
    `Expected action capability, got: ${capabilities.join(', ')}`);
});

test('extractTargetAudience finds domain-specific audiences', () => {
  const crawl = createRichCrawlData();
  const audiences = extractTargetAudience(crawl);

  assert.ok(audiences.length >= 1, `Expected at least 1 audience, got ${audiences.length}`);
  // Should find "agile coaches" or "project managers" from broad patterns
  assert.ok(audiences.some((a) => a.toLowerCase().includes('coach') || a.toLowerCase().includes('enterprise') || a.toLowerCase().includes('startup') || a.toLowerCase().includes('developer')),
    `Expected domain-specific audience, got: ${audiences.join(', ')}`);
});

// ─── New Industry Detection ─────────────────────────────────────────────────

test('inferIndustry detects Sports Technology', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      metaDescription: 'Voice-to-feedback coaching platform for postgame analysis.',
      textContent: 'PostGame AI helps coaches with postgame player evaluation and sports analytics.',
    },
  });

  assert.equal(inferIndustry(crawl), 'Sports Technology');
});

test('inferIndustry detects Legal Technology', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      metaDescription: 'Modern legal technology for law firms.',
      textContent: 'Streamline your law firm operations with our legal platform.',
    },
  });

  assert.equal(inferIndustry(crawl), 'Legal Technology');
});

test('inferIndustry detects Construction', () => {
  const crawl = createCrawlData({
    homepage: {
      ...createCrawlData().homepage,
      metaDescription: 'Software for construction contractors.',
      textContent: 'Manage your construction projects and contractor workflows.',
    },
  });

  assert.equal(inferIndustry(crawl), 'Construction');
});

test('inferIndustry analyzes sub-pages beyond homepage', () => {
  const homepage = {
    ...createCrawlData().homepage,
    metaDescription: 'A platform for your team.',
    textContent: 'Welcome to our platform.',
  };
  const subPage = {
    ...createCrawlData().homepage,
    url: 'https://example.com/features',
    textContent: 'Our coaching tools help with postgame analysis and athlete performance.',
    classification: 'service',
  };
  const crawl = createCrawlData({
    homepage,
    pages: [homepage, subPage],
  });

  assert.equal(inferIndustry(crawl), 'Sports Technology');
});

// ─── New Prompt Categories ──────────────────────────────────────────────────

test('generatePrompts produces prompts with new categories for rich data', () => {
  const crawl = createRichCrawlData();
  const prompts = generatePrompts(crawl);

  const categories = new Set(prompts.map((p) => p.category));
  const sources = new Set(prompts.map((p) => p.source));

  // Should have use-case and/or workflow prompts from the enriched data
  assert.ok(sources.has('use-case') || sources.has('workflow') || sources.has('problem') || sources.has('buyer'),
    `Expected new prompt sources, got: ${[...sources].join(', ')}`);
});

test('mockMentionTester handles new categories without crashing', async () => {
  const categories = ['workflow', 'use-case', 'problem-solution', 'buyer-intent'];

  for (const category of categories) {
    const prompt = makePrompt(`new-${category}`, `Test prompt for ${category}`, category);
    const response = await mockMentionTester.query('chatgpt', prompt);

    assert.ok(typeof response.text === 'string', `${category} should return text`);
    assert.ok(response.text.length > 0, `${category} should return non-empty text`);
  }
});

// ─── Junk Filtering Tests ────────────────────────────────────────────────────

test('extractProducts rejects numbered legal headings', () => {
  const servicePage = {
    url: 'https://example.com/terms',
    title: 'Terms',
    h1s: ['Terms'],
    headings: [
      { level: 2, text: '1. Acceptance of Terms' },
      { level: 2, text: '2. Governing Law' },
      { level: 2, text: 'AcmeBoard Pro Suite' },
      { level: 3, text: 'Privacy Policy' },
    ],
    metaDescription: '',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: [],
    textContent: '',
    wordCount: 100,
    statusCode: 200,
    loadTimeMs: 50,
    classification: 'service',
    detectedPlatform: 'custom',
  };

  const crawl = createCrawlData({ pages: [servicePage], homepage: createCrawlData().homepage });
  const products = extractProducts(crawl);

  assert.ok(!products.some((p) => p.includes('Acceptance of Terms')),
    `Should not include legal heading "1. Acceptance of Terms", got: ${products.join(', ')}`);
  assert.ok(!products.some((p) => p.includes('Governing Law')),
    `Should not include legal heading "2. Governing Law", got: ${products.join(', ')}`);
  assert.ok(!products.some((p) => p.toLowerCase().includes('privacy policy')),
    `Should not include "Privacy Policy", got: ${products.join(', ')}`);
});

test('extractFeatures rejects single-word headings', () => {
  const servicePage = {
    url: 'https://example.com/features',
    title: 'Features',
    h1s: ['Features'],
    headings: [
      { level: 3, text: 'Product' },
      { level: 3, text: 'Support' },
      { level: 3, text: 'Real-time Collaboration Feature' },
    ],
    metaDescription: '',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: [],
    textContent: '',
    wordCount: 100,
    statusCode: 200,
    loadTimeMs: 50,
    classification: 'service',
    detectedPlatform: 'custom',
  };

  const crawl = createCrawlData({ pages: [servicePage], homepage: createCrawlData().homepage });
  const features = extractFeatures(crawl);

  assert.ok(!features.includes('Product'),
    `Should not include single-word "Product", got: ${features.join(', ')}`);
  assert.ok(!features.includes('Support'),
    `Should not include single-word "Support", got: ${features.join(', ')}`);
});

test('extractUseCases rejects CTA/pricing noise', () => {
  const hp = {
    ...createCrawlData().homepage,
    textContent: 'This tool helps you sign up for a free trial today. It also helps teams cancel anytime with no commitment. It helps businesses track sprint progress in real time.',
    headings: [
      { level: 1, text: 'Welcome' },
      { level: 2, text: 'Sign Up Now' },
    ],
    classification: 'homepage',
  };

  const crawl = createCrawlData({ homepage: hp, pages: [hp] });
  const useCases = extractUseCases(crawl);

  assert.ok(!useCases.some((u) => u.toLowerCase().includes('sign up')),
    `Should not include CTA "sign up", got: ${useCases.join(', ')}`);
  assert.ok(!useCases.some((u) => u.toLowerCase().includes('cancel anytime')),
    `Should not include "cancel anytime", got: ${useCases.join(', ')}`);
  assert.ok(!useCases.some((u) => u.toLowerCase().includes('free trial')),
    `Should not include "free trial", got: ${useCases.join(', ')}`);
});

test('extractProblemStatements rejects gerund-starting fragments', () => {
  const hp = {
    ...createCrawlData().homepage,
    textContent: 'Stop adding more work to your day. Stop getting lost in spreadsheets. Tired of wasting hours on manual data entry every week.',
    classification: 'homepage',
  };

  const crawl = createCrawlData({ homepage: hp, pages: [hp] });
  const problems = extractProblemStatements(crawl);

  assert.ok(!problems.some((p) => /^adding\b/i.test(p)),
    `Should not include gerund-starting "adding...", got: ${problems.join(', ')}`);
  assert.ok(!problems.some((p) => /^getting\b/i.test(p)),
    `Should not include gerund-starting "getting...", got: ${problems.join(', ')}`);
  // "wasting hours on manual data entry every week" should pass (starts with "wasting" but is from "tired of" pattern, not "without/stop" pattern)
});

test('generatePrompts rejects prompts with legal heading content', () => {
  const servicePage = {
    url: 'https://example.com/terms',
    title: 'Terms',
    h1s: ['Terms of Service'],
    headings: [
      { level: 2, text: '1. Acceptance of Terms' },
      { level: 2, text: '2. Governing Law' },
      { level: 3, text: '3. Limitation of Liability' },
    ],
    metaDescription: '',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: [],
    textContent: 'These are our terms of service. 1. Acceptance of Terms. 2. Governing Law applies.',
    wordCount: 100,
    statusCode: 200,
    loadTimeMs: 50,
    classification: 'service',
    detectedPlatform: 'custom',
  };

  const crawl = createCrawlData({
    pages: [createCrawlData().homepage, servicePage],
    homepage: createCrawlData().homepage,
  });

  const prompts = generatePrompts(crawl);

  // No prompt should contain legal heading text
  for (const p of prompts) {
    assert.ok(!p.text.toLowerCase().includes('acceptance of terms'),
      `Prompt should not contain legal text: "${p.text}"`);
    assert.ok(!p.text.toLowerCase().includes('governing law'),
      `Prompt should not contain legal text: "${p.text}"`);
  }
});

test('isJunk detects numbered legal headings', () => {
  assert.equal(isJunk('1. Acceptance of Terms'), true);
  assert.equal(isJunk('12. Governing Law'), true);
  assert.equal(isJunk('3. Limitation of Liability'), true);
});

test('isJunk detects CTA/pricing noise', () => {
  assert.equal(isJunk('Cancel Anytime'), true);
  assert.equal(isJunk('Best Value Plan'), true);
  assert.equal(isJunk('Sign Up Today'), true);
  assert.equal(isJunk('Free Trial Available'), true);
});

test('isJunk allows legitimate content', () => {
  assert.equal(isJunk('AcmeBoard Pro Suite'), false);
  assert.equal(isJunk('Real-time Collaboration'), false);
  assert.equal(isJunk('Sprint Planning'), false);
});

test('isValidPromptText rejects short prompts', () => {
  assert.equal(isValidPromptText('Hi?'), false);
  assert.equal(isValidPromptText('Test'), false);
});

test('isValidPromptText rejects prompts with too few words', () => {
  assert.equal(isValidPromptText('Single word'), false);
});

test('isValidPromptText rejects legal heading content', () => {
  assert.equal(isValidPromptText('What is the best 1. acceptance of terms tool?'), false);
});

test('isValidPromptText rejects truncated text ending in short word', () => {
  assert.equal(isValidPromptText('What is the best tool fo?'), false);
});

test('isValidPromptText accepts valid prompts', () => {
  assert.equal(isValidPromptText('What is the best project management tool?'), true);
  assert.equal(isValidPromptText('Tell me about AcmeTools'), true);
});

// ─── E-Commerce / Non-SaaS Junk Filtering ───────────────────────────────────

function createEcommerceCrawlData() {
  const homepage = {
    url: 'https://boatparts.com/',
    title: 'BoatParts | Marine Hardware & Accessories',
    h1s: ['Marine Hardware & Accessories'],
    headings: [
      { level: 1, text: 'Marine Hardware & Accessories' },
      { level: 2, text: 'Shop Our Categories' },
      { level: 2, text: 'Follow Us' },
      { level: 2, text: 'Contact Us' },
      { level: 3, text: 'Newsletter' },
    ],
    metaDescription: 'BoatParts sells marine hardware and boat accessories online.',
    metaKeywords: ['boat parts', 'marine hardware'],
    ogTags: { 'og:site_name': 'BoatParts' },
    twitterTags: {},
    canonicalUrl: 'https://boatparts.com/',
    viewport: 'width=device-width, initial-scale=1',
    hasFavicon: true,
    lang: 'en',
    charset: 'utf-8',
    schemaObjects: [
      { type: 'Organization', raw: { name: 'BoatParts', description: 'Leading marine hardware supplier' } },
    ],
    schemaParseErrors: 0,
    internalLinks: ['/products', '/blog'],
    externalLinks: [],
    textContent: 'BoatParts sells marine hardware. Tailored for Noah Flegel. Made for all. Shop our store for the best boat accessories.',
    wordCount: 400,
    lastModified: 'Mon, 01 Mar 2026 12:00:00 GMT',
    statusCode: 200,
    loadTimeMs: 100,
    classification: 'homepage',
    detectedPlatform: 'custom',
  };

  const productPage = {
    url: 'https://boatparts.com/products/screws',
    title: 'Marine Screws | BoatParts',
    h1s: ['Marine Screws'],
    headings: [
      { level: 1, text: 'Marine Screws' },
      { level: 2, text: 'Frequently Bought Together' },
      { level: 2, text: 'Customer Reviews' },
      { level: 2, text: 'Product Details' },
      { level: 3, text: 'Shipping & Returns' },
      { level: 3, text: 'Write a Review' },
      { level: 2, text: 'You May Also Like' },
      { level: 2, text: 'Recently Viewed' },
    ],
    metaDescription: 'High-quality marine screws for your boat.',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [
      { type: 'Product', raw: { name: 'Stainless Steel Marine Screws' } },
    ],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: [],
    textContent: '1/4" screws will damage the lugs! Set of 4 screws. 3/8" stainless steel. Dimensions: 2" x 1/2" x 3/4". For boats and marine use. Designed for heavy-duty applications and marine environments.',
    wordCount: 300,
    statusCode: 200,
    loadTimeMs: 90,
    classification: 'service',
    detectedPlatform: 'custom',
  };

  const blogPage = {
    url: 'https://boatparts.com/blog',
    title: 'News | BoatParts Blog',
    h1s: ['News'],
    headings: [
      { level: 1, text: 'News' },
      { level: 2, text: 'Learn More' },
      { level: 2, text: 'Read More' },
    ],
    metaDescription: 'Latest news from BoatParts.',
    metaKeywords: [],
    ogTags: {},
    twitterTags: {},
    hasFavicon: true,
    schemaObjects: [
      { type: 'Article', raw: { headline: 'News' } },
    ],
    schemaParseErrors: 0,
    internalLinks: [],
    externalLinks: [],
    textContent: 'Latest updates from BoatParts.',
    wordCount: 200,
    statusCode: 200,
    loadTimeMs: 80,
    classification: 'blog',
    detectedPlatform: 'custom',
  };

  const allPages = [homepage, productPage, blogPage];

  return {
    url: 'https://boatparts.com/',
    normalizedUrl: 'https://boatparts.com',
    detectedPlatform: 'custom',
    rootHttp: { finalUrl: 'https://boatparts.com/', statusCode: 200, https: true, headers: {} },
    renderReadiness: { mode: 'server-rendered', detail: '' },
    robotsTxt: { exists: true, raw: '', allowsGPTBot: true, allowsPerplexityBot: true, allowsClaudeBot: true, allowsGoogleBot: true, sitemapReferences: [] },
    sitemap: { exists: true, urls: allPages.map((p) => p.url), urlCount: allPages.length, referencedInRobots: true, accessStatus: 'ok', format: 'xml', sourceUrl: '' },
    llmsTxt: { exists: false, raw: '', title: null, description: null, sections: [], links: [] },
    pages: allPages,
    homepage,
    crawledAt: Date.now(),
    durationMs: 2000,
    errors: [],
  };
}

// 1. isJunk rejects e-commerce UI patterns
test('isJunk rejects e-commerce UI patterns', () => {
  assert.equal(isJunk('Frequently Bought Together'), true);
  assert.equal(isJunk('Customer Reviews'), true);
  assert.equal(isJunk('Recently Viewed'), true);
  assert.equal(isJunk('You May Also Like'), true);
  assert.equal(isJunk('Product Details'), true);
  assert.equal(isJunk('Write a Review'), true);
  assert.equal(isJunk('Shipping & Returns'), true);
  assert.equal(isJunk('Add to Wishlist'), true);
  assert.equal(isJunk('Compare Products'), true);
  assert.equal(isJunk('Related Products'), true);
  assert.equal(isJunk('Customers Also Bought'), true);
});

// 2. isJunk rejects social/nav CTAs
test('isJunk rejects social/nav CTAs', () => {
  assert.equal(isJunk('Follow Us'), true);
  assert.equal(isJunk('Contact Us'), true);
  assert.equal(isJunk('Learn More'), true);
  assert.equal(isJunk('Read More'), true);
  assert.equal(isJunk('See More'), true);
  assert.equal(isJunk('View All'), true);
  assert.equal(isJunk('Show More'), true);
  assert.equal(isJunk('Load More'), true);
  assert.equal(isJunk('Back to Top'), true);
  assert.equal(isJunk('Share This'), true);
  assert.equal(isJunk('Subscribe'), true);
  assert.equal(isJunk('Newsletter'), true);
});

// 3. isJunk rejects measurement-heavy text
test('isJunk rejects measurement-heavy text', () => {
  assert.equal(isJunk('1/4" x 3/8" x 1/2"'), true);
  assert.equal(isJunk('15mm x 20mm bolt'), true);
});

// 4. extractIndustryTerms rejects nav items
test('extractIndustryTerms rejects nav items', () => {
  const crawl = createEcommerceCrawlData();
  const terms = extractIndustryTerms(crawl);

  assert.ok(!terms.some((t) => t.toLowerCase() === 'follow us'),
    `Should not include "Follow Us" as industry term, got: ${terms.join(', ')}`);
  assert.ok(!terms.some((t) => t.toLowerCase() === 'contact us'),
    `Should not include "Contact Us" as industry term, got: ${terms.join(', ')}`);
  assert.ok(!terms.some((t) => t.toLowerCase() === 'learn more'),
    `Should not include "Learn More" as industry term, got: ${terms.join(', ')}`);
});

// 5. extractBlogTopics rejects single-word topics
test('extractBlogTopics rejects single-word topics', () => {
  const crawl = createEcommerceCrawlData();
  const topics = extractBlogTopics(crawl);

  assert.ok(!topics.some((t) => t.toLowerCase() === 'news'),
    `Should not include single-word "News" as blog topic, got: ${topics.join(', ')}`);
});

// 6. extractTargetAudience rejects product spec fragments
test('extractTargetAudience rejects product spec fragments', () => {
  const crawl = createEcommerceCrawlData();
  const audiences = extractTargetAudience(crawl);

  assert.ok(!audiences.some((a) => /\d+[/"']/.test(a) || a.toLowerCase().includes('screws')),
    `Should not include product spec text as audience, got: ${audiences.join(', ')}`);
});

// 7. extractProducts rejects e-commerce UI headings
test('extractProducts rejects e-commerce UI headings', () => {
  const crawl = createEcommerceCrawlData();
  const products = extractProducts(crawl);

  assert.ok(!products.some((p) => p.toLowerCase().includes('frequently bought')),
    `Should not include "Frequently Bought Together", got: ${products.join(', ')}`);
  assert.ok(!products.some((p) => p.toLowerCase().includes('customer reviews')),
    `Should not include "Customer Reviews", got: ${products.join(', ')}`);
  assert.ok(!products.some((p) => p.toLowerCase().includes('recently viewed')),
    `Should not include "Recently Viewed", got: ${products.join(', ')}`);
  assert.ok(!products.some((p) => p.toLowerCase().includes('you may also like')),
    `Should not include "You May Also Like", got: ${products.join(', ')}`);
});

// 8. isValidPromptText rejects prompts with measurements
test('isValidPromptText rejects prompts with measurements', () => {
  assert.equal(isValidPromptText('What is the best 1/4" screws tool?'), false);
  assert.equal(isValidPromptText('Best 3/8" marine hardware supplier?'), false);
  assert.equal(isValidPromptText('Which tools offer 15mm bolt solutions?'), false);
});

// 9. isValidPromptText rejects prompts with exclamation marks
test('isValidPromptText rejects prompts with exclamation marks', () => {
  assert.equal(isValidPromptText('These screws will damage the lugs! Best alternative?'), false);
  assert.equal(isValidPromptText('Warning! Do not use cheap marine hardware'), false);
});

// 10. isValidPromptText rejects prompts with embedded periods
test('isValidPromptText rejects prompts with embedded periods', () => {
  assert.equal(isValidPromptText('What is the best for noah flegel. made for all. tool'), false);
  assert.equal(isValidPromptText('Best tailored for noah flegel. made for everyone tool'), false);
});

// 11. generatePrompts produces clean prompts for e-commerce site
test('generatePrompts produces clean prompts for e-commerce site', () => {
  const crawl = createEcommerceCrawlData();
  const prompts = generatePrompts(crawl);

  assert.ok(prompts.length >= 15, `Expected at least 15 prompts, got ${prompts.length}`);
  assert.ok(prompts.length <= 25, `Expected at most 25 prompts, got ${prompts.length}`);

  // No prompt should contain e-commerce garbage
  for (const p of prompts) {
    assert.ok(!p.text.toLowerCase().includes('frequently bought'),
      `Prompt should not contain e-commerce UI: "${p.text}"`);
    assert.ok(!p.text.toLowerCase().includes('customer reviews'),
      `Prompt should not contain e-commerce UI: "${p.text}"`);
    assert.ok(!p.text.toLowerCase().includes('follow us'),
      `Prompt should not contain nav CTA: "${p.text}"`);
    assert.ok(!p.text.toLowerCase().includes('contact us'),
      `Prompt should not contain nav CTA: "${p.text}"`);
    assert.ok(!p.text.includes('!'),
      `Prompt should not contain exclamation mark: "${p.text}"`);
    assert.ok(!/\d+[/"']/.test(p.text),
      `Prompt should not contain measurements: "${p.text}"`);
  }
});

// 12. generatePrompts still produces good prompts for SaaS site (regression)
test('generatePrompts still produces good prompts for SaaS site', () => {
  const crawl = createRichCrawlData();
  const prompts = generatePrompts(crawl);

  assert.ok(prompts.length >= 15, `Expected at least 15 prompts, got ${prompts.length}`);
  assert.ok(prompts.length <= 25, `Expected at most 25 prompts, got ${prompts.length}`);

  // Should still have content-derived prompts (not all backfill)
  const contentSources = prompts.filter((p) => p.source !== 'core' && p.source !== 'backfill' && p.source !== 'fallback');
  assert.ok(contentSources.length >= 3,
    `Expected at least 3 content-derived prompts for SaaS site, got ${contentSources.length}: ${contentSources.map(p => p.source).join(', ')}`);

  // Should include known good prompts
  assert.ok(prompts.some((p) => p.text.includes('AcmeTools')),
    'Should include brand name in prompts');
});

// looksLikeFragment tests
test('looksLikeFragment rejects mid-sentence starts', () => {
  assert.equal(looksLikeFragment('screws will damage the lugs'), true);
  assert.equal(looksLikeFragment('tailored for noah flegel'), true);
});

test('looksLikeFragment rejects truncated endings', () => {
  assert.equal(looksLikeFragment('Best tools for marine and'), true);
  assert.equal(looksLikeFragment('High quality hardware with'), true);
});

test('looksLikeFragment rejects HTML artifacts', () => {
  assert.equal(looksLikeFragment('Best tools &amp; hardware'), true);
  assert.equal(looksLikeFragment('View &#8220;products&#8221;'), true);
});

test('looksLikeFragment accepts valid text', () => {
  assert.equal(looksLikeFragment('What is the best marine hardware?'), false);
  assert.equal(looksLikeFragment('Best boat accessories for professionals'), false);
});
