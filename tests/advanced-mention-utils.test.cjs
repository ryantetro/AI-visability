require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeAverageRank,
  computeProminenceFallback,
  formatAverageRankDisplay,
} = require('../src/app/advanced/lib/mention-utils.ts');

test('computeAverageRank averages only explicit ranked placements', () => {
  const average = computeAverageRank([
    { mentioned: true, position: 1 },
    { mentioned: true, position: 3 },
    { mentioned: true, position: null },
    { mentioned: false, position: 2 },
  ]);

  assert.equal(average, 2);
});

test('formatAverageRankDisplay rounds average rank up to a clean whole number', () => {
  assert.equal(formatAverageRankDisplay(1.2), 2);
  assert.equal(formatAverageRankDisplay(2), 2);
  assert.equal(formatAverageRankDisplay(null), null);
});

test('computeProminenceFallback returns Prominent when most mentions are strong', () => {
  const fallback = computeProminenceFallback([
    { mentioned: true, positionContext: 'prominent' },
    { mentioned: true, positionContext: 'listed_ranking' },
    { mentioned: true, positionContext: 'passing' },
  ]);

  assert.ok(fallback);
  assert.equal(fallback.label, 'Prominent');
  assert.equal(fallback.strongMentionPct, 67);
});

test('computeProminenceFallback distinguishes Mixed and Passing mentions', () => {
  const mixed = computeProminenceFallback([
    { mentioned: true, positionContext: 'prominent' },
    { mentioned: true, positionContext: 'passing' },
    { mentioned: true, positionContext: 'passing' },
  ]);
  const passing = computeProminenceFallback([
    { mentioned: true, positionContext: 'passing' },
    { mentioned: true, positionContext: 'passing' },
  ]);

  assert.ok(mixed);
  assert.equal(mixed.label, 'Mixed');
  assert.ok(passing);
  assert.equal(passing.label, 'Passing');
});
