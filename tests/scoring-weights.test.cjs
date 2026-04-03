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
  // (50*1 + 80*0.5 + 60*0.5) / 2 = (50+40+30)/2 = 60
  assert.equal(computeOverallFromPillars(50, 80, 60, 70), 60);
});

test('computeOverallFromPillars: aggregate fallback when pillars missing', () => {
  // (40*1 + 72*0.5) / 1.5 = (40+36)/1.5 = 50.67 -> 51
  assert.equal(computeOverallFromPillars(40, null, null, 72), 51);
});

test('computeOverallFromPillars: null when no web health', () => {
  assert.equal(computeOverallFromPillars(55, null, null, null), null);
});

test('computePublicOverallScore: all four components', () => {
  // (60 + 80*0.5 + 70*0.5 + 40) / 3 = (60+40+35+40)/3 = 175/3 ≈ 58.33 -> 58
  assert.equal(computePublicOverallScore(60, 80, 70, 40), 58);
});

test('computePublicOverallScore: visibility + mentions only', () => {
  assert.equal(computePublicOverallScore(70, null, null, 30), 50);
});

test('weights are stable contract', () => {
  assert.equal(WEIGHT_AI_VISIBILITY, 1.0);
  assert.equal(WEIGHT_PERFORMANCE, 0.5);
  assert.equal(WEIGHT_TRUST, 0.5);
});
