/**
 * Single source of truth for overall score weights (AI visibility, PageSpeed, trust, mentions).
 * Used by scan-time scoring and public/display summaries so formulas cannot drift.
 */

export const WEIGHT_AI_VISIBILITY = 1.0;
export const WEIGHT_PERFORMANCE = 0.25;
export const WEIGHT_TRUST = 0.25;
export const WEIGHT_MENTIONS = 1.0;
/** Fallback when performance/trust pillars are unavailable but aggregate web health exists */
export const WEIGHT_WEB_HEALTH_AGGREGATE = 0.25;

const SUM_AV_PERFORMANCE_TRUST =
  WEIGHT_AI_VISIBILITY + WEIGHT_PERFORMANCE + WEIGHT_TRUST;
const SUM_AV_WEB_FALLBACK = WEIGHT_AI_VISIBILITY + WEIGHT_WEB_HEALTH_AGGREGATE;

/**
 * Scan-time overall (mentions not available yet).
 * When both pillars exist: weighted mean with weights 1.0 / 0.25 / 0.25.
 * Else if aggregate web health exists: (aiVisibility + 0.25 * webHealth) / 1.25.
 */
export function computeOverallFromPillars(
  aiVisibility: number,
  perfScore: number | null,
  trustScore: number | null,
  webHealthAggregate: number | null,
): number | null {
  if (perfScore !== null && trustScore !== null) {
    const sum =
      aiVisibility * WEIGHT_AI_VISIBILITY +
      perfScore * WEIGHT_PERFORMANCE +
      trustScore * WEIGHT_TRUST;
    return Math.round(sum / SUM_AV_PERFORMANCE_TRUST);
  }
  if (webHealthAggregate !== null) {
    const sum =
      aiVisibility * WEIGHT_AI_VISIBILITY +
      webHealthAggregate * WEIGHT_WEB_HEALTH_AGGREGATE;
    return Math.round(sum / SUM_AV_WEB_FALLBACK);
  }
  return null;
}

/**
 * Display overall including mentions (e.g. public score page). Each component omitted if null.
 */
export function computePublicOverallScore(
  aiVisibility: number,
  perfScore: number | null,
  trustScore: number | null,
  mentionScore: number | null,
): number {
  let weightedSum = aiVisibility * WEIGHT_AI_VISIBILITY;
  let weightSum = WEIGHT_AI_VISIBILITY;

  if (perfScore !== null) {
    weightedSum += perfScore * WEIGHT_PERFORMANCE;
    weightSum += WEIGHT_PERFORMANCE;
  }
  if (trustScore !== null) {
    weightedSum += trustScore * WEIGHT_TRUST;
    weightSum += WEIGHT_TRUST;
  }
  if (mentionScore !== null) {
    weightedSum += mentionScore * WEIGHT_MENTIONS;
    weightSum += WEIGHT_MENTIONS;
  }

  return Math.round(weightedSum / weightSum);
}
