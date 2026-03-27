require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const { mockPromptMonitoring } = require('../src/lib/services/mock-prompt-monitoring.ts');

test('mock prompt monitoring persists enriched run metadata', async () => {
  const domain = `example-${Date.now()}.com`;
  const prompt = await mockPromptMonitoring.createPrompt({
    domain,
    userId: 'user-1',
    promptText: 'What are the best AI visibility platforms?',
    category: 'custom',
    industry: 'Technology',
    active: true,
  });

  await mockPromptMonitoring.savePromptResult({
    promptId: prompt.id,
    domain,
    engine: 'chatgpt',
    mentioned: true,
    mentionType: 'direct',
    position: 2,
    positionContext: 'listed_ranking',
    sentiment: 'positive',
    sentimentLabel: 'positive',
    sentimentStrength: 8,
    sentimentReasoning: 'Strong recommendation language.',
    keyQuote: 'Example Co is a strong option.',
    citationPresent: true,
    citationUrls: [{ url: 'https://example.com', domain: 'example.com', anchorText: null, isOwnDomain: true, isCompetitor: false }],
    descriptionAccuracy: 'accurate',
    analysisSource: 'llm',
    competitorsJson: [{ name: 'Competitor One', position: 1 }],
    monitoringRunId: 'run-123',
    runWeightedScore: 72,
    runScoreDelta: -12,
    notableScoreChange: true,
    rawSnippet: 'Example Co is a strong option.',
    testedAt: new Date().toISOString(),
  });

  const [result] = await mockPromptMonitoring.listPromptResults(domain, 10, 'user-1');
  assert.equal(result.monitoringRunId, 'run-123');
  assert.equal(result.runWeightedScore, 72);
  assert.equal(result.runScoreDelta, -12);
  assert.equal(result.notableScoreChange, true);
  assert.equal(result.analysisSource, 'llm');
  assert.deepEqual(result.competitorsJson, [{ name: 'Competitor One', position: 1 }]);
});

test('mock prompt monitoring persists competitor movement metadata', async () => {
  const domain = `movement-${Date.now()}.com`;

  await mockPromptMonitoring.saveCompetitorAppearance({
    domain,
    competitor: 'Competitor One',
    competitorDomain: null,
    engine: 'chatgpt',
    promptId: null,
    position: 2,
    previousPosition: 5,
    movementDelta: 3,
    isNewCompetitor: false,
    coMentioned: true,
    weekStart: '2026-03-23',
  });

  const summaries = await mockPromptMonitoring.listCompetitorSummaries(domain, 30);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].competitor, 'Competitor One');
  assert.equal(summaries[0].avgPosition, 2);
});
