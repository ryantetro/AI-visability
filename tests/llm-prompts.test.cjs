require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBotTrackingInstallPrompt,
  buildBotTrackingSnippet,
  buildReportPromptBundle,
} = require('../src/lib/llm-prompts.ts');

function createScoreResult() {
  return {
    total: 30,
    maxTotal: 100,
    percentage: 32,
    band: 'not-visible',
    bandInfo: { band: 'not-visible', label: 'Not Visible', color: '#ff5252', min: 0, max: 39 },
    overallBand: 'not-visible',
    overallBandInfo: { band: 'not-visible', label: 'Not Visible', color: '#ff5252', min: 0, max: 39 },
    dimensions: [
      { key: 'file-presence', label: 'File Presence', score: 0, maxScore: 20, percentage: 0, checks: [] },
      { key: 'structured-data', label: 'Structured Data', score: 0, maxScore: 20, percentage: 0, checks: [] },
      { key: 'ai-registration', label: 'AI Registration', score: 0, maxScore: 10, percentage: 0, checks: [] },
      { key: 'content-signals', label: 'Content Signals', score: 16, maxScore: 20, percentage: 80, checks: [] },
      { key: 'topical-authority', label: 'Topical Authority', score: 18, maxScore: 20, percentage: 90, checks: [] },
      { key: 'entity-clarity', label: 'Entity Clarity', score: 8, maxScore: 10, percentage: 80, checks: [] },
    ],
    fixes: [
      {
        checkId: 'fp-llms-txt',
        label: 'llms.txt file',
        detail: 'Missing llms.txt',
        dimension: 'file-presence',
        category: 'ai',
        pointsAvailable: 10,
        estimatedLift: 8,
        urgency: 4,
        effort: 2,
        effortBand: 'quick',
        roi: 4,
        instruction: 'Add llms.txt',
        copyPrompt: 'fix llms',
      },
      {
        checkId: 'sd-org-schema',
        label: 'Organization schema',
        detail: 'Missing schema',
        dimension: 'structured-data',
        category: 'ai',
        pointsAvailable: 8,
        estimatedLift: 6,
        urgency: 4,
        effort: 2,
        effortBand: 'medium',
        roi: 3,
        instruction: 'Add org schema',
        copyPrompt: 'fix schema',
      },
      {
        checkId: 'cs-about-page',
        label: 'About page depth',
        detail: 'Thin about page',
        dimension: 'content-signals',
        category: 'ai',
        pointsAvailable: 5,
        estimatedLift: 4,
        urgency: 3,
        effort: 2,
        effortBand: 'medium',
        roi: 2,
        instruction: 'Expand about page',
        copyPrompt: 'fix about',
      },
      {
        checkId: 'whq-open-graph',
        label: 'Open Graph coverage',
        detail: 'Missing OG tags',
        dimension: 'quality',
        category: 'web',
        pointsAvailable: 5,
        estimatedLift: 3,
        urgency: 3,
        effort: 1,
        effortBand: 'quick',
        roi: 3,
        instruction: 'Add OG tags',
        copyPrompt: 'fix og',
      },
      {
        checkId: 'whp-performance-score',
        label: 'Performance score',
        detail: 'Performance is slow',
        dimension: 'performance',
        category: 'web',
        pointsAvailable: 10,
        estimatedLift: 7,
        urgency: 4,
        effort: 4,
        effortBand: 'technical',
        roi: 2,
        instruction: 'Improve performance',
        copyPrompt: 'fix perf',
      },
      {
        checkId: 'whs-https',
        label: 'HTTPS',
        detail: 'Missing security headers',
        dimension: 'security',
        category: 'web',
        pointsAvailable: 6,
        estimatedLift: 4,
        urgency: 4,
        effort: 2,
        effortBand: 'quick',
        roi: 2,
        instruction: 'Improve security headers',
        copyPrompt: 'fix security',
      },
    ],
    scores: {
      aiVisibility: 12,
      webHealth: 48,
      overall: 32,
      potentialLift: 30,
    },
    webHealth: {
      status: 'complete',
      percentage: 48,
      pillars: [
        { key: 'quality', label: 'Website Quality', score: 30, maxScore: 63, percentage: 48, status: 'complete', checks: [] },
        { key: 'security', label: 'Trust & Security', score: 16, maxScore: 30, percentage: 53, status: 'complete', checks: [] },
        { key: 'performance', label: 'PageSpeed', score: 4, maxScore: 24, percentage: 17, status: 'complete', checks: [] },
      ],
      metrics: [],
    },
  };
}

test('buildReportPromptBundle includes scoped section prompts', () => {
  const bundle = buildReportPromptBundle('https://example.com', createScoreResult());

  assert.ok(bundle.fullPrompt.includes('llms.txt file'));
  assert.ok(bundle.fullPrompt.includes('Performance score'));
  assert.ok(bundle.fullPrompt.includes('Do not invent fake company names'));
  assert.ok(bundle.fullPrompt.includes('Canonical host: https://example.com'));
  assert.ok(bundle.fullPrompt.includes('inspect the current application, relevant project files, and existing site implementation'));
  assert.ok(bundle.fullPrompt.includes('Inspect any existing JSON-LD already present in the application'));

  assert.equal(bundle.sectionPrompts.aiReadiness?.actionableFixCount, 2);
  assert.ok(bundle.sectionPrompts.aiReadiness?.prompt.includes('llms.txt file'));
  assert.ok(bundle.sectionPrompts.aiReadiness?.prompt.includes('Organization schema'));
  assert.ok(!bundle.sectionPrompts.aiReadiness?.prompt.includes('Performance score'));
  assert.ok(bundle.sectionPrompts.aiReadiness?.prompt.includes('Do not use placeholder company names'));
  assert.ok(bundle.sectionPrompts.aiReadiness?.prompt.includes('Use the real site domain in examples'));
  assert.ok(bundle.sectionPrompts.aiReadiness?.prompt.includes('inspect the current application, relevant project files, and existing site implementation'));
  assert.ok(bundle.sectionPrompts.aiReadiness?.prompt.includes('Ensure the Organization or LocalBusiness schema is complete enough'));
  assert.ok(bundle.sectionPrompts.aiReadiness?.prompt.includes('Inspect any existing JSON-LD already present in the application'));

  assert.equal(bundle.sectionPrompts.contentAuthority?.actionableFixCount, 1);
  assert.ok(bundle.sectionPrompts.contentAuthority?.prompt.includes('About page depth'));
  assert.ok(!bundle.sectionPrompts.contentAuthority?.prompt.includes('Open Graph coverage'));

  assert.equal(bundle.sectionPrompts.websiteQuality?.actionableFixCount, 1);
  assert.ok(bundle.sectionPrompts.websiteQuality?.prompt.includes('Open Graph coverage'));
  assert.ok(!bundle.sectionPrompts.websiteQuality?.prompt.includes('HTTPS'));

  assert.equal(bundle.sectionPrompts.performanceSecurity?.actionableFixCount, 2);
  assert.ok(bundle.sectionPrompts.performanceSecurity?.prompt.includes('Performance score'));
  assert.ok(bundle.sectionPrompts.performanceSecurity?.prompt.includes('HTTPS'));
});

test('buildReportPromptBundle omits section prompts with no actionable fixes', () => {
  const score = createScoreResult();
  score.fixes = score.fixes.filter((fix) => fix.dimension !== 'quality');

  const bundle = buildReportPromptBundle('https://example.com', score);

  assert.equal(bundle.sectionPrompts.websiteQuality, undefined);
});

test('buildBotTrackingInstallPrompt locks implementation to the customer site and selected runtime', () => {
  const prompt = buildBotTrackingInstallPrompt({
    domain: 'getpostgame.ai',
    runtime: 'next',
    appUrl: 'https://app.aiso.com',
    siteKey: 'stk_1234567890abcdef1234567890abcdef',
  });

  assert.ok(prompt.includes("This task is for the customer's own website/application only. Do not modify airadr itself."));
  assert.ok(prompt.includes('Do not add or change airadr backend routes, middleware, database tables, migrations, auth, rate limiting, or tracking services.'));
  assert.ok(prompt.includes('Do not invent a new `/api/track` route in the target project.'));
  assert.ok(prompt.includes('Selected runtime: Next.js / Vercel'));
  assert.ok(prompt.includes('https://app.aiso.com/api/track'));
  assert.ok(prompt.includes("sk: 'stk_1234567890abcdef1234567890abcdef'"));
  assert.ok(prompt.includes('export function middleware(request)'));
  assert.ok(prompt.includes('middleware.ts or middleware.js at the project root'));
  assert.ok(prompt.includes('Short explanation'));
  assert.ok(prompt.includes('Do not answer with a system redesign, backend architecture proposal, database schema, or airadr-side implementation.'));
});

test('buildBotTrackingSnippet returns the correct runtime-specific snippet', () => {
  const expressSnippet = buildBotTrackingSnippet(
    'express',
    'https://app.aiso.com',
    'stk_1234567890abcdef1234567890abcdef'
  );

  assert.ok(expressSnippet.includes('app.use((req, res, next) => {'));
  assert.ok(expressSnippet.includes("p: req.path"));
  assert.ok(expressSnippet.includes('"GoogleOther": "training"'));
  assert.ok(expressSnippet.includes('"Google-CloudVertexBot": "training"'));
  assert.ok(!expressSnippet.includes('Google-Extended'));
  assert.ok(!expressSnippet.includes('request.nextUrl.pathname'));
});
