require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPromptMonitoringRunPlan,
  runPromptMonitoringForDomain,
} = require('../src/lib/prompt-monitoring.ts');
const { mockPromptMonitoring } = require('../src/lib/services/mock-prompt-monitoring.ts');

test('buildPromptMonitoringRunPlan queues only active prompts missing results', () => {
  const now = Date.now();
  const prompts = [
    { id: 'prompt-a', active: true },
    { id: 'prompt-b', active: true },
    { id: 'prompt-c', active: false },
  ];
  const results = [
    { promptId: 'prompt-a', testedAt: new Date(now - (10 * 60 * 1000)).toISOString() },
  ];

  const plan = buildPromptMonitoringRunPlan(prompts, results);

  assert.equal(plan.shouldQueue, true);
  assert.equal(plan.reason, 'missing-results');
  assert.deepEqual(plan.promptIds, ['prompt-b']);
});

test('buildPromptMonitoringRunPlan queues only stale prompts when newer prompts already have fresh coverage', () => {
  const now = Date.now();
  const prompts = [
    { id: 'prompt-a', active: true },
    { id: 'prompt-b', active: true },
    { id: 'prompt-c', active: true },
  ];
  const results = [
    { promptId: 'prompt-a', testedAt: new Date(now - (30 * 60 * 1000)).toISOString() },
    { promptId: 'prompt-b', testedAt: new Date(now - (13 * 60 * 60 * 1000)).toISOString() },
    { promptId: 'prompt-c', testedAt: new Date(now - (10 * 60 * 1000)).toISOString() },
  ];

  const plan = buildPromptMonitoringRunPlan(prompts, results);

  assert.equal(plan.shouldQueue, true);
  assert.equal(plan.reason, 'stale-results');
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

test('runPromptMonitoringForDomain prioritizes the stalest prompts when the engine budget is limited', async () => {
  const domain = `priority-${Date.now()}.example.com`;
  const userId = `user-${Date.now()}`;
  const now = Date.now();

  const freshestPrompt = await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'Which STEM workshops are strongest for high school students?',
    category: 'industry',
    industry: 'Education',
    active: true,
  });

  const stalePrompt = await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'How do girls build confidence in STEM careers?',
    category: 'industry',
    industry: 'Education',
    active: true,
  });

  const stalestPrompt = await mockPromptMonitoring.createPrompt({
    domain,
    userId,
    promptText: 'Which mentorship programs best support girls in tech?',
    category: 'industry',
    industry: 'Education',
    active: true,
  });

  await mockPromptMonitoring.savePromptResult({
    promptId: freshestPrompt.id,
    domain,
    engine: 'chatgpt',
    mentioned: true,
    mentionType: 'direct',
    position: 1,
    positionContext: 'listed_ranking',
    sentiment: 'positive',
    sentimentLabel: 'positive',
    sentimentStrength: 8,
    sentimentReasoning: 'Fresh result',
    keyQuote: 'Fresh prompt result',
    citationPresent: false,
    citationUrls: [],
    descriptionAccuracy: 'accurate',
    analysisSource: 'heuristic',
    competitorsJson: [],
    monitoringRunId: 'seed-fresh',
    runWeightedScore: 60,
    runScoreDelta: null,
    notableScoreChange: false,
    rawSnippet: 'Fresh result',
    testedAt: new Date(now - (30 * 60 * 1000)).toISOString(),
  });

  await mockPromptMonitoring.savePromptResult({
    promptId: stalePrompt.id,
    domain,
    engine: 'chatgpt',
    mentioned: true,
    mentionType: 'direct',
    position: 2,
    positionContext: 'listed_ranking',
    sentiment: 'neutral',
    sentimentLabel: 'neutral',
    sentimentStrength: 5,
    sentimentReasoning: 'Stale result',
    keyQuote: 'Stale prompt result',
    citationPresent: false,
    citationUrls: [],
    descriptionAccuracy: 'accurate',
    analysisSource: 'heuristic',
    competitorsJson: [],
    monitoringRunId: 'seed-stale',
    runWeightedScore: 45,
    runScoreDelta: null,
    notableScoreChange: false,
    rawSnippet: 'Stale result',
    testedAt: new Date(now - (2 * 24 * 60 * 60 * 1000)).toISOString(),
  });

  await mockPromptMonitoring.savePromptResult({
    promptId: stalestPrompt.id,
    domain,
    engine: 'chatgpt',
    mentioned: false,
    mentionType: 'not_mentioned',
    position: null,
    positionContext: 'absent',
    sentiment: null,
    sentimentLabel: null,
    sentimentStrength: 0,
    sentimentReasoning: null,
    keyQuote: null,
    citationPresent: false,
    citationUrls: [],
    descriptionAccuracy: null,
    analysisSource: 'heuristic',
    competitorsJson: [],
    monitoringRunId: 'seed-stalest',
    runWeightedScore: 10,
    runScoreDelta: null,
    notableScoreChange: false,
    rawSnippet: 'Oldest result',
    testedAt: new Date(now - (5 * 24 * 60 * 60 * 1000)).toISOString(),
  });

  const mentionTester = {
    supportsProviderPacing: false,
    availableEngines() {
      return ['chatgpt'];
    },
    async query(engine, prompt) {
      return {
        engine,
        prompt,
        text: `${prompt.brand || 'SheTech'} is worth considering.`,
        testedAt: Date.now(),
      };
    },
  };

  const summary = await runPromptMonitoringForDomain({
    domain,
    maxEngineCalls: 1,
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
  const latestResult = results[0];

  assert.equal(summary.engineCalls, 1);
  assert.equal(summary.successfulEngineCalls, 1);
  assert.equal(summary.budgetExhausted, true);
  assert.equal(latestResult.promptId, stalestPrompt.id);
});
