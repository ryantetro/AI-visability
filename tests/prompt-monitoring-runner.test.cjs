require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPromptMonitoringRunPlan,
  runPromptMonitoringForDomain,
} = require('../src/lib/prompt-monitoring.ts');
const { mockPromptMonitoring } = require('../src/lib/services/mock-prompt-monitoring.ts');

test('buildPromptMonitoringRunPlan queues only active prompts missing results', () => {
  const prompts = [
    { id: 'prompt-a', active: true },
    { id: 'prompt-b', active: true },
    { id: 'prompt-c', active: false },
  ];
  const results = [
    { promptId: 'prompt-a', testedAt: '2026-04-01T00:00:00.000Z' },
  ];

  const plan = buildPromptMonitoringRunPlan(prompts, results);

  assert.equal(plan.shouldQueue, true);
  assert.equal(plan.reason, 'missing-results');
  assert.deepEqual(plan.promptIds, ['prompt-b']);
});

test('runPromptMonitoringForDomain seeds results for the requested prompt subset', async () => {
  const domain = `seed-${Date.now()}.example.com`;
  const userId = `user-${Date.now()}`;

  const firstPrompt = await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'What are the best STEM programs for high school girls?',
    category: 'industry',
    industry: 'Education',
    active: true,
  });

  const secondPrompt = await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'How does SheTech help girls explore careers in tech?',
    category: 'brand',
    industry: 'Education',
    active: true,
  });

  const mentionTester = {
    supportsProviderPacing: false,
    availableEngines() {
      return ['chatgpt', 'perplexity'];
    },
    async query(engine, prompt) {
      return {
        engine,
        prompt,
        text: `${prompt.brand || 'SheTech'} is a top option for young women in STEM.`,
        testedAt: Date.now(),
      };
    },
  };

  const summary = await runPromptMonitoringForDomain({
    domain,
    promptIds: [firstPrompt.id],
    maxEngineCalls: 10,
    deps: {
      promptMonitoring: mockPromptMonitoring,
      mentionTester,
      businessProfileResolver: async () => ({
        brand: 'SheTech',
        domain,
        industry: 'Education',
        location: 'Salt Lake City, Utah',
        vertical: 'general',
        businessType: 'service_business',
        siteModel: 'service_site',
        categoryPhrases: [],
        productCategories: [],
        serviceSignals: [],
        geoSignals: [],
        similarityKeywords: [],
        scanCompetitorSeeds: [],
      }),
      promptRuntimeResolver: async ({ allEngines }) => ({
        engines: allEngines,
        primaryRegionId: 'us',
        blocked: false,
      }),
    },
  });

  const results = await mockPromptMonitoring.listPromptResults(domain, 20, userId);
  const firstPromptResults = results.filter((result) => result.promptId === firstPrompt.id);
  const secondPromptResults = results.filter((result) => result.promptId === secondPrompt.id);

  assert.equal(summary.runExecuted, true);
  assert.equal(summary.promptsChecked, 2);
  assert.equal(summary.promptErrors, 0);
  assert.equal(summary.engineCalls, 2);
  assert.equal(firstPromptResults.length, 2);
  assert.equal(secondPromptResults.length, 0);
  assert.ok(firstPromptResults.every((result) => result.mentioned));
});

test('runPromptMonitoringForDomain counts failed attempts toward the engine budget', async () => {
  const domain = `budget-${Date.now()}.example.com`;
  const userId = `user-${Date.now()}`;

  await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'What are the best AI observability tools?',
    category: 'direct',
    industry: 'Technology',
    active: true,
  });

  await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'Which AI visibility platforms are worth tracking?',
    category: 'direct',
    industry: 'Technology',
    active: true,
  });

  let attempts = 0;
  const mentionTester = {
    supportsProviderPacing: false,
    availableEngines() {
      return ['chatgpt', 'perplexity'];
    },
    async query() {
      attempts += 1;
      throw new Error('synthetic provider failure');
    },
  };

  const summary = await runPromptMonitoringForDomain({
    domain,
    maxEngineCalls: 1,
    deps: {
      promptMonitoring: mockPromptMonitoring,
      mentionTester,
      businessProfileResolver: async () => ({
        brand: 'Airadr',
        domain,
        industry: 'Technology',
        location: 'Denver, Colorado',
        vertical: 'general',
        businessType: 'service_business',
        siteModel: 'service_site',
        categoryPhrases: [],
        productCategories: [],
        serviceSignals: [],
        geoSignals: [],
        similarityKeywords: [],
        scanCompetitorSeeds: [],
      }),
      promptRuntimeResolver: async ({ allEngines }) => ({
        engines: allEngines,
        primaryRegionId: 'us',
        blocked: false,
      }),
    },
  });

  assert.equal(attempts, 1);
  assert.equal(summary.engineCalls, 1);
  assert.equal(summary.successfulEngineCalls, 0);
  assert.equal(summary.promptErrors, 1);
  assert.equal(summary.budgetExhausted, true);
  assert.equal(summary.reason, 'budget-exhausted');
});

test('runPromptMonitoringForDomain stops immediately when the wall-clock deadline has already passed', async () => {
  const domain = `deadline-${Date.now()}.example.com`;
  const userId = `user-${Date.now()}`;

  await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'Who are the best AI visibility platforms?',
    category: 'direct',
    industry: 'Technology',
    active: true,
  });

  let attempts = 0;
  const mentionTester = {
    supportsProviderPacing: false,
    availableEngines() {
      return ['chatgpt'];
    },
    async query() {
      attempts += 1;
      return {
        engine: 'chatgpt',
        prompt: {
          id: 'prompt-1',
          text: 'test',
          category: 'direct',
          industry: 'Technology',
          brand: 'Airadr',
        },
        text: 'Airadr is a strong option.',
        testedAt: Date.now(),
      };
    },
  };

  const summary = await runPromptMonitoringForDomain({
    domain,
    deadlineAt: Date.now() - 1,
    deps: {
      promptMonitoring: mockPromptMonitoring,
      mentionTester,
      businessProfileResolver: async () => ({
        brand: 'Airadr',
        domain,
        industry: 'Technology',
        location: 'Denver, Colorado',
        vertical: 'general',
        businessType: 'service_business',
        siteModel: 'service_site',
        categoryPhrases: [],
        productCategories: [],
        serviceSignals: [],
        geoSignals: [],
        similarityKeywords: [],
        scanCompetitorSeeds: [],
      }),
      promptRuntimeResolver: async ({ allEngines }) => ({
        engines: allEngines,
        primaryRegionId: 'us',
        blocked: false,
      }),
    },
  });

  assert.equal(attempts, 0);
  assert.equal(summary.engineCalls, 0);
  assert.equal(summary.successfulEngineCalls, 0);
  assert.equal(summary.budgetExhausted, true);
  assert.equal(summary.reason, 'budget-exhausted');
});
