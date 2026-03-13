import { getBandInfo } from '@/lib/scorer';
import { ScoreResult } from '@/types/score';

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function serializeScoreResult(score: ScoreResult) {
  const overallBandInfo = score.scores.overall !== null
    ? getBandInfo(score.scores.overall)
    : score.overallBandInfo;

  return {
    total: score.total,
    maxTotal: score.maxTotal,
    percentage: score.percentage,
    band: score.band,
    bandInfo: score.bandInfo,
    overallBand: overallBandInfo.band,
    overallBandInfo,
    dimensions: score.dimensions,
    fixes: score.fixes,
    webHealth: score.webHealth || null,
    scores: score.scores,
  };
}

export function buildSharePayload(scanId: string) {
  const appUrl = getAppUrl();
  return {
    publicUrl: `${appUrl}/score/${scanId}`,
    badgeSvgUrl: `${appUrl}/api/badge/${scanId}`,
    opengraphImageUrl: `${appUrl}/score/${scanId}/opengraph-image`,
  };
}
