import { getDatabase } from '@/lib/services/registry';
import { ScoreResult } from '@/types/score';
import { getDomain } from '@/lib/url-utils';

export interface PublicScoreSummary {
  id: string;
  url: string;
  domain: string;
  completedAt: number;
  percentage: number;
  total: number;
  maxTotal: number;
  band: string;
  bandInfo: {
    band: string;
    label: string;
    color: string;
    min: number;
    max: number;
  };
}

export async function getPublicScoreSummary(scanId: string): Promise<PublicScoreSummary | null> {
  const db = getDatabase();
  const scan = await db.getScan(scanId);

  if (!scan || scan.status !== 'complete' || !scan.scoreResult || !scan.completedAt) {
    return null;
  }

  const scoreResult = scan.scoreResult as ScoreResult;

  return {
    id: scan.id,
    url: scan.url,
    domain: getDomain(scan.url),
    completedAt: scan.completedAt,
    percentage: scoreResult.percentage,
    total: scoreResult.total,
    maxTotal: scoreResult.maxTotal,
    band: scoreResult.band,
    bandInfo: scoreResult.bandInfo,
  };
}
