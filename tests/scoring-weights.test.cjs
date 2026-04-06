require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeOverallFromPillars,
  computePublicOverallScore,
  WEIGHT_AI_VISIBILITY,
  WEIGHT_PERFORMANCE,
  WEIGHT_TRUST,
} = require('../src/lib/scoring-weights.ts');

test('computeOverallFromPillars: both pillars', () => {
  // (50*1 + 80*0.25 + 60*0.25) / 1.5 = (50+20+15)/1.5 = 56.67 -> 57
  assert.equal(computeOverallFromPillars(50, 80, 60, 70), 57);
});

test('computeOverallFromPillars: aggregate fallback when pillars missing', () => {
  // (40*1 + 72*0.25) / 1.25 = (40+18)/1.25 = 46.4 -> 46
  assert.equal(computeOverallFromPillars(40, null, null, 72), 46);
});

test('computeOverallFromPillars: null when no web health', () => {
  assert.equal(computeOverallFromPillars(55, null, null, null), null);
});

test('computePublicOverallScore: all four components', () => {
  // (60*1 + 80*0.25 + 70*0.25 + 40*1) / 2.5 = (60+20+17.5+40)/2.5 = 55
  assert.equal(computePublicOverallScore(60, 80, 70, 40), 55);
});

test('computePublicOverallScore: visibility + mentions only', () => {
  assert.equal(computePublicOverallScore(70, null, null, 30), 50);
});

test('weights are stable contract', () => {
  assert.equal(WEIGHT_AI_VISIBILITY, 1.0);
  assert.equal(WEIGHT_PERFORMANCE, 0.25);
  assert.equal(WEIGHT_TRUST, 0.25);
});
