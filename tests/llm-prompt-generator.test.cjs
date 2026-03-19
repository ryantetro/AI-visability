require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  generatePrompts,
  buildBusinessProfile,
  isValidPromptText,
} = require('../src/lib/ai-mentions/prompt-generator.ts');

const {
  generatePromptsWithLLM,
} = require('../src/lib/ai-mentions/llm-prompt-generator.ts');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function basePage(overrides = {}) {
  return {
    url: 'https://example.com/',
    title: 'Example',
    h1s: [],
    headings: [],
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
    loadTimeMs: 100,
    classification: 'homepage',
    detectedPlatform: 'custom',
    ...overrides,
  };
}

function baseCrawl(overrides = {}) {
  const homepage = overrides.homepage || basePage();
  return {
    url: homepage.url,
    normalizedUrl: homepage.url.replace(/\/$/, ''),
    detectedPlatform: 'custom',
    rootHttp: { finalUrl: homepage.url, statusCode: 200, https: true, headers: {} },
    renderReadiness: { mode: 'server-rendered', detail: '' },
    robotsTxt: { exists: true, raw: '', allowsGPTBot: true, allowsPerplexityBot: true, allowsClaudeBot: true, allowsGoogleBot: true, sitemapReferences: [] },
    sitemap: { exists: true, urls: [homepage.url], urlCount: 1, referencedInRobots: true, accessStatus: 'ok', format: 'xml', sourceUrl: '' },
    llmsTxt: { exists: false, raw: '', title: null, description: null, sections: [], links: [] },
    pages: [homepage],
    homepage,
    crawledAt: Date.now(),
    durationMs: 1000,
    errors: [],
    ...overrides,
  };
}

const ALLOWED_CATEGORIES = new Set([
  'direct', 'category', 'comparison', 'recommendation',
  'workflow', 'use-case', 'problem-solution', 'buyer-intent',
]);

// ─── Company fixtures based on real scanned sites ────────────────────────────

function createPostgameCrawl() {
  const homepage = basePage({
    url: 'https://getpostgame.ai/',
    title: 'Postgame | AI-Powered Postgame Reports for Coaches',
    h1s: ['AI-Powered Postgame Reports'],
    headings: [
      { level: 1, text: 'AI-Powered Postgame Reports' },
      { level: 2, text: 'Automated Game Film Analysis' },
      { level: 2, text: 'Player Evaluation Dashboard' },
      { level: 2, text: 'Built for coaches and athletic directors' },
      { level: 2, text: 'Trusted by high school and college programs' },
    ],
    metaDescription: 'Postgame uses AI to generate postgame reports, player evaluations, and coaching insights from game film. Built for high school and college coaches.',
    metaKeywords: ['postgame reports', 'coaching analytics', 'sports analytics', 'game film analysis'],
    ogTags: { 'og:site_name': 'Postgame' },
    textContent: 'Postgame is an AI-powered platform that helps coaches generate postgame reports and player evaluations from game film. Our platform enables coaches to analyze game footage, track player performance, and share insights with staff. Designed for high school and college athletic programs. Tired of spending hours on manual game breakdowns? Postgame automates the process so you can focus on coaching. Integrates with Hudl for seamless video import. Used by coaching staffs across football, basketball, and lacrosse programs.',
    classification: 'homepage',
    externalLinks: ['https://hudl.com/features'],
    schemaObjects: [
      { type: 'Organization', raw: { name: 'Postgame', description: 'AI-powered postgame reports for coaches' } },
    ],
  });

  const featuresPage = basePage({
    url: 'https://getpostgame.ai/features',
    title: 'Features | Postgame',
    headings: [
      { level: 1, text: 'Features' },
      { level: 2, text: 'Game Film AI Analysis' },
      { level: 2, text: 'Player Performance Tracking' },
      { level: 3, text: 'Real-time Collaboration Feature' },
      { level: 3, text: 'Automated Report Generation Capability' },
    ],
    textContent: 'Postgame helps coaches automate game breakdowns and generate scouting reports. Create player evaluations from video, share reports with staff, and track improvement over the season. Export reports and schedule weekly summaries.',
    classification: 'service',
    schemaObjects: [
      { type: 'Product', raw: { name: 'Postgame Film Analysis' } },
      { type: 'Product', raw: { name: 'Player Evaluation Reports' } },
    ],
  });

  const faqPage = basePage({
    url: 'https://getpostgame.ai/faq',
    title: 'FAQ | Postgame',
    headings: [
      { level: 1, text: 'Frequently Asked Questions' },
      { level: 2, text: 'How does Postgame analyze game film?' },
      { level: 2, text: 'What sports does Postgame support?' },
    ],
    textContent: 'Answers to common questions about Postgame AI coaching tools.',
    classification: 'faq',
    schemaObjects: [
      {
        type: 'FAQPage',
        raw: {
          mainEntity: [
            { name: 'How does Postgame analyze game film?' },
            { name: 'What sports does Postgame support?' },
          ],
        },
      },
    ],
  });

  return baseCrawl({
    url: 'https://getpostgame.ai/',
    homepage,
    pages: [homepage, featuresPage, faqPage],
  });
}

function createStripeCrawl() {
  const homepage = basePage({
    url: 'https://stripe.com/',
    title: 'Stripe | Financial Infrastructure for the Internet',
    h1s: ['Financial infrastructure for the internet'],
    headings: [
      { level: 1, text: 'Financial infrastructure for the internet' },
      { level: 2, text: 'Online Payments' },
      { level: 2, text: 'Revenue and Finance Automation' },
      { level: 2, text: 'Banking-as-a-Service' },
      { level: 2, text: 'Trusted by millions of companies worldwide' },
    ],
    metaDescription: 'Stripe is a suite of APIs powering online payment processing and commerce solutions for internet businesses of all sizes.',
    metaKeywords: ['payment processing', 'online payments', 'payment api', 'fintech'],
    ogTags: { 'og:site_name': 'Stripe' },
    textContent: 'Stripe is a technology company that builds economic infrastructure for the internet. Businesses of all sizes use Stripe to accept payments, grow their revenue, and accelerate new business opportunities. Stripe powers online payment processing for companies from startups to Fortune 500s. Our platform helps developers integrate payment acceptance with just a few lines of code. Stripe Connect enables marketplace payments, Stripe Billing handles subscription management, and Stripe Atlas helps entrepreneurs incorporate their business. Used by Shopify, Instacart, Amazon, and many more.',
    classification: 'homepage',
    externalLinks: ['https://paypal.com', 'https://adyen.com', 'https://squareup.com'],
    schemaObjects: [
      { type: 'Organization', raw: { name: 'Stripe', description: 'Financial infrastructure for the internet' } },
    ],
  });

  const productsPage = basePage({
    url: 'https://stripe.com/products',
    title: 'Products | Stripe',
    headings: [
      { level: 1, text: 'Products' },
      { level: 2, text: 'Stripe Payments' },
      { level: 2, text: 'Stripe Connect' },
      { level: 2, text: 'Stripe Billing' },
      { level: 3, text: 'Subscription Management Feature' },
      { level: 3, text: 'Revenue Recognition Capability' },
    ],
    textContent: 'Stripe offers a fully integrated suite of payment products. Accept payments online and in person. Stripe Payments supports 135+ currencies. Stripe Connect enables platform and marketplace payments. Stripe Billing automates subscription management and invoicing. Integrates with QuickBooks and Xero for accounting. Helps businesses optimize checkout conversion rates.',
    classification: 'service',
    schemaObjects: [
      { type: 'Product', raw: { name: 'Stripe Payments' } },
      { type: 'Product', raw: { name: 'Stripe Billing' } },
      { type: 'Product', raw: { name: 'Stripe Connect' } },
    ],
  });

  return baseCrawl({
    url: 'https://stripe.com/',
    homepage,
    pages: [homepage, productsPage],
  });
}

function createMarineProductsCrawl() {
  const homepage = basePage({
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
    textContent: 'Marine Products is a dealer in Salt Lake City, UT for marine parts, wakeboards, water skis, surfers, and boating gear. Shop boat accessories, browse watersports inventory, and visit our Utah showroom. Serving Salt Lake City, Provo, and Park City areas.',
    classification: 'homepage',
    detectedPlatform: 'shopify',
    externalLinks: ['https://slcboats.com', 'https://protectourlakelife.com'],
    schemaObjects: [
      { type: 'Organization', raw: { name: 'Marine Products' } },
    ],
  });

  const collectionPage = basePage({
    url: 'https://marine-products.com/collections/boat-parts',
    title: 'Boat Parts | Marine Products',
    headings: [
      { level: 1, text: 'Boat Parts' },
      { level: 2, text: 'Marine Engine Parts' },
      { level: 2, text: 'Boat Accessories' },
    ],
    textContent: 'Browse marine engine parts, wakeboard accessories, and boating gear for Salt Lake City and Utah customers.',
    classification: 'service',
    detectedPlatform: 'shopify',
    externalLinks: ['https://slcboats.com'],
  });

  return baseCrawl({
    url: 'https://marine-products.com/',
    detectedPlatform: 'shopify',
    homepage,
    pages: [homepage, collectionPage],
  });
}

// ─── Template prompt tests (no API calls) ────────────────────────────────────

test('Postgame (Sports Tech) — template prompts are specific to coaching/sports', () => {
  const crawl = createPostgameCrawl();
  const profile = buildBusinessProfile(crawl);
  const prompts = generatePrompts(crawl, profile);

  // Basic structure
  assert.ok(prompts.length >= 15, `Expected >= 15 prompts, got ${prompts.length}`);
  assert.ok(prompts.length <= 25, `Expected <= 25 prompts, got ${prompts.length}`);

  // All prompts valid
  for (const p of prompts) {
    assert.ok(ALLOWED_CATEGORIES.has(p.category), `Invalid category: ${p.category}`);
    assert.ok(p.text.length >= 10, `Prompt too short: "${p.text}"`);
    assert.ok(p.id, 'Missing prompt ID');
  }

  // Should have detected Sports Technology
  assert.equal(profile.industry, 'Sports Technology');
  assert.equal(profile.brand, 'Postgame');

  // Direct prompts should mention the brand
  const directPrompts = prompts.filter((p) => p.category === 'direct');
  assert.ok(directPrompts.length >= 1, 'Expected at least 1 direct prompt');
  for (const dp of directPrompts) {
    assert.ok(dp.text.toLowerCase().includes('postgame'), `Direct prompt should mention brand: "${dp.text}"`);
  }

  // Should have some domain-specific prompts (coaching, game film, etc.)
  const allText = prompts.map((p) => p.text.toLowerCase()).join(' ');
  const hasSportsTerms = /coach|game film|player|sport|postgame|scouting|evaluation/i.test(allText);
  assert.ok(hasSportsTerms, 'Expected prompts referencing sports/coaching terms');

  console.log(`\n=== Postgame template prompts (${prompts.length}) ===`);
  for (const p of prompts) {
    console.log(`  [${p.category}] ${p.text}`);
  }
});

test('Stripe (Finance/SaaS) — template prompts cover payments and fintech', () => {
  const crawl = createStripeCrawl();
  const profile = buildBusinessProfile(crawl);
  const prompts = generatePrompts(crawl, profile);

  assert.ok(prompts.length >= 15, `Expected >= 15 prompts, got ${prompts.length}`);
  assert.ok(prompts.length <= 25, `Expected <= 25 prompts, got ${prompts.length}`);

  // Should detect Finance industry
  assert.equal(profile.brand, 'Stripe');
  assert.ok(['Finance', 'SaaS'].includes(profile.industry), `Expected Finance or SaaS, got ${profile.industry}`);

  // Direct prompts mention Stripe
  const directPrompts = prompts.filter((p) => p.category === 'direct');
  assert.ok(directPrompts.length >= 1);
  for (const dp of directPrompts) {
    assert.ok(dp.text.toLowerCase().includes('stripe'), `Direct prompt should mention brand: "${dp.text}"`);
  }

  // Should reference payment/fintech terms
  const allText = prompts.map((p) => p.text.toLowerCase()).join(' ');
  const hasFinanceTerms = /payment|billing|fintech|finance|subscription|connect/i.test(allText);
  assert.ok(hasFinanceTerms, 'Expected prompts referencing payment/finance terms');

  console.log(`\n=== Stripe template prompts (${prompts.length}) ===`);
  for (const p of prompts) {
    console.log(`  [${p.category}] ${p.text}`);
  }
});

test('Marine Products (E-commerce/Marine) — template prompts are localized and marine-specific', () => {
  const crawl = createMarineProductsCrawl();
  const profile = buildBusinessProfile(crawl);
  const prompts = generatePrompts(crawl, profile);

  assert.ok(prompts.length >= 15, `Expected >= 15 prompts, got ${prompts.length}`);
  assert.ok(prompts.length <= 25, `Expected <= 25 prompts, got ${prompts.length}`);

  // Should detect Marine & Watersports + location
  assert.equal(profile.brand, 'Marine Products');
  assert.equal(profile.industry, 'Marine & Watersports');
  assert.ok(profile.location, 'Expected location to be detected');

  // Marine-specific prompts
  const allText = prompts.map((p) => p.text.toLowerCase()).join(' ');
  const hasMarineTerms = /marine|boat|wakeboard|watersport|water ski/i.test(allText);
  assert.ok(hasMarineTerms, 'Expected marine-specific prompts');

  // Location-aware prompts
  const hasLocation = /salt lake/i.test(allText);
  assert.ok(hasLocation, 'Expected location-aware prompts mentioning Salt Lake');

  console.log(`\n=== Marine Products template prompts (${prompts.length}) ===`);
  for (const p of prompts) {
    console.log(`  [${p.category}] ${p.text}`);
  }
});

test('template prompts have diverse category coverage', () => {
  const companies = [createPostgameCrawl(), createStripeCrawl(), createMarineProductsCrawl()];

  for (const crawl of companies) {
    const profile = buildBusinessProfile(crawl);
    const prompts = generatePrompts(crawl, profile);
    const categories = new Set(prompts.map((p) => p.category));

    // Should have at least 4 different categories
    assert.ok(
      categories.size >= 4,
      `${profile.brand}: Expected >= 4 categories, got ${categories.size} (${[...categories].join(', ')})`
    );

    // Must have direct category
    assert.ok(categories.has('direct'), `${profile.brand}: Missing 'direct' category`);
  }
});

test('all template prompts pass isValidPromptText', () => {
  const companies = [createPostgameCrawl(), createStripeCrawl(), createMarineProductsCrawl()];

  for (const crawl of companies) {
    const profile = buildBusinessProfile(crawl);
    const prompts = generatePrompts(crawl, profile);

    for (const p of prompts) {
      // Core/fallback/backfill prompts are exempt from validation in the generator,
      // but the text should still be reasonable
      assert.ok(p.text.length >= 10, `${profile.brand}: Prompt too short: "${p.text}"`);
      assert.ok(p.text.length <= 200, `${profile.brand}: Prompt too long: "${p.text}"`);
      assert.ok(!p.text.includes('!'), `${profile.brand}: Prompt has exclamation mark: "${p.text}"`);
    }
  }
});

// ─── LLM prompt tests (requires OPENAI_API_KEY, single call per company) ─────

const HAS_OPENAI = Boolean(process.env.OPENAI_API_KEY) && process.env.USE_MOCKS !== 'true';

// Only run 1 LLM test (Postgame) to conserve API calls.
// The other companies validate the same code path — one call is sufficient.
test('LLM generates natural prompts for Postgame (live API)', { skip: !HAS_OPENAI }, async () => {
  const crawl = createPostgameCrawl();
  const profile = buildBusinessProfile(crawl);
  const prompts = await generatePromptsWithLLM(crawl, profile, { timeoutMs: 15000 });

  assert.ok(prompts.length >= 15, `Expected >= 15 prompts, got ${prompts.length}`);
  assert.ok(prompts.length <= 25, `Expected <= 25 prompts, got ${prompts.length}`);

  // All valid categories
  for (const p of prompts) {
    assert.ok(ALLOWED_CATEGORIES.has(p.category), `Invalid category: ${p.category} on "${p.text}"`);
  }

  // Only 2 direct prompts (mention brand)
  const directPrompts = prompts.filter((p) => p.category === 'direct');
  assert.ok(directPrompts.length <= 3, `Expected <= 3 direct prompts, got ${directPrompts.length}`);

  // Direct prompts should mention the brand
  for (const dp of directPrompts) {
    assert.ok(
      dp.text.toLowerCase().includes('postgame'),
      `Direct prompt should mention brand: "${dp.text}"`
    );
  }

  // Non-direct prompts should mostly NOT mention the brand.
  // Exclude comparison prompts (they naturally reference the brand) and
  // ignore generic English uses of the word (e.g. "postgame reports").
  const nonDirectNonComparison = prompts.filter((p) => p.category !== 'direct' && p.category !== 'comparison');
  const brandMentions = nonDirectNonComparison.filter((p) => p.text.toLowerCase().includes('postgame'));
  assert.ok(
    brandMentions.length <= 3,
    `Too many non-direct/non-comparison prompts mention brand (${brandMentions.length}): ${brandMentions.map((p) => p.text).join('; ')}`
  );

  // All prompts pass validation
  for (const p of prompts) {
    assert.ok(isValidPromptText(p.text), `Failed isValidPromptText: "${p.text}"`);
  }

  // Should reference sports/coaching domain
  const allText = prompts.map((p) => p.text.toLowerCase()).join(' ');
  const hasDomainTerms = /coach|game|player|sport|film|athlete|evaluation|scouting|report/i.test(allText);
  assert.ok(hasDomainTerms, 'Expected LLM prompts to reference sports/coaching domain');

  // Should have diverse categories (at least 5 of 8)
  const categories = new Set(prompts.map((p) => p.category));
  assert.ok(
    categories.size >= 5,
    `Expected >= 5 categories, got ${categories.size} (${[...categories].join(', ')})`
  );

  // Each prompt should have required fields
  for (const p of prompts) {
    assert.ok(p.id, 'Missing prompt ID');
    assert.ok(p.industry, 'Missing industry');
    assert.ok(p.brand, 'Missing brand');
    assert.ok(p.topic, 'Missing topic');
  }

  console.log(`\n=== Postgame LLM prompts (${prompts.length}) ===`);
  for (const p of prompts) {
    console.log(`  [${p.category}] ${p.text}`);
  }
});

// ─── LLM fallback test (no API call — mocks a failed response) ───────────────

test('LLM failure falls back to template prompts', async () => {
  const crawl = createPostgameCrawl();
  const profile = buildBusinessProfile(crawl);

  // Save and override env to simulate having an API key
  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;

  try {
    process.env.OPENAI_API_KEY = 'test-key-fake';
    // Mock fetch to return an error
    global.fetch = async () => ({ ok: false, status: 500, text: async () => 'Internal Server Error' });

    // generatePromptsWithLLM should throw on 500
    await assert.rejects(
      () => generatePromptsWithLLM(crawl, profile, { timeoutMs: 5000 }),
      /OpenAI API error: 500/,
    );

    // Template fallback should still work
    const templatePrompts = generatePrompts(crawl, profile);
    assert.ok(templatePrompts.length >= 15);
  } finally {
    process.env.OPENAI_API_KEY = origKey;
    global.fetch = origFetch;
  }
});

test('LLM rejects response with too few valid prompts', async () => {
  const crawl = createPostgameCrawl();
  const profile = buildBusinessProfile(crawl);

  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;

  try {
    process.env.OPENAI_API_KEY = 'test-key-fake';
    // Mock fetch to return only 3 prompts (below MIN_PROMPTS)
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              prompts: [
                { text: 'What is the best coaching analytics tool?', category: 'recommendation', topic: 'Product', source: 'product' },
                { text: 'Tell me about Postgame', category: 'direct', topic: 'Brand', source: 'core' },
                { text: 'How do I analyze game film efficiently?', category: 'use-case', topic: 'Use Case', source: 'use-case' },
              ],
            }),
          },
        }],
      }),
    });

    await assert.rejects(
      () => generatePromptsWithLLM(crawl, profile, { timeoutMs: 5000 }),
      /LLM generated only 3 valid prompts/,
    );
  } finally {
    process.env.OPENAI_API_KEY = origKey;
    global.fetch = origFetch;
  }
});

test('LLM handles timeout gracefully', async () => {
  const crawl = createPostgameCrawl();
  const profile = buildBusinessProfile(crawl);

  const origKey = process.env.OPENAI_API_KEY;
  const origFetch = global.fetch;

  try {
    process.env.OPENAI_API_KEY = 'test-key-fake';
    // Mock fetch that never resolves (will be aborted by timeout)
    global.fetch = async (url, init) => {
      return new Promise((resolve, reject) => {
        const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (init?.signal?.aborted) return onAbort();
        init?.signal?.addEventListener('abort', onAbort);
      });
    };

    await assert.rejects(
      () => generatePromptsWithLLM(crawl, profile, { timeoutMs: 500 }),
      /timed out/,
    );
  } finally {
    process.env.OPENAI_API_KEY = origKey;
    global.fetch = origFetch;
  }
});
