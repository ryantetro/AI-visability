import { CrawlData } from '@/types/crawler';
import { CheckResult, DimensionKey, DimensionScore, ScoreBandInfo, ScoreResult, WebHealthSummary } from '@/types/score';
import { runFilePresenceChecks } from './checks/file-presence';
import { runStructuredDataChecks } from './checks/structured-data';
import { runContentSignalChecks } from './checks/content-signals';
import { runTopicalAuthorityChecks } from './checks/topical-authority';
import { runEntityClarityChecks } from './checks/entity-clarity';
import { runAiRegistrationChecks } from './checks/ai-registration';
import { prioritizeFixes } from './priority';

const dimensionLabels: Record<DimensionKey, string> = {
  'file-presence': 'File Presence',
  'structured-data': 'Structured Data',
  'content-signals': 'Content Signals',
  'topical-authority': 'Topical Authority',
  'entity-clarity': 'Entity Clarity',
  'ai-registration': 'AI Registration',
};

const bands: ScoreBandInfo[] = [
  { band: 'ai-ready', label: 'AI Ready', color: '#25c972', min: 80, max: 100 },
  { band: 'needs-work', label: 'Needs Work', color: '#ff8a1e', min: 60, max: 79 },
  { band: 'at-risk', label: 'At Risk', color: '#ff7424', min: 40, max: 59 },
  { band: 'not-visible', label: 'Not Visible', color: '#ff5252', min: 0, max: 39 },
];

export function scoreCrawlData(data: CrawlData, webHealth?: WebHealthSummary): ScoreResult {
  const allChecks: CheckResult[] = [
    ...runFilePresenceChecks(data),
    ...runStructuredDataChecks(data),
    ...runContentSignalChecks(data),
    ...runTopicalAuthorityChecks(data),
    ...runEntityClarityChecks(data),
    ...runAiRegistrationChecks(data),
  ];

  // Group by dimension
  const dimensionKeys: DimensionKey[] = [
    'file-presence', 'structured-data', 'content-signals',
    'topical-authority', 'entity-clarity', 'ai-registration',
  ];

  const dimensions: DimensionScore[] = dimensionKeys.map((key) => {
    const checks = allChecks.filter((c) => c.dimension === key);
    const score = checks.reduce((sum, c) => sum + c.points, 0);
    const maxScore = checks.reduce((sum, c) => sum + (c.verdict === 'unknown' ? 0 : c.maxPoints), 0);
    return {
      key,
      label: dimensionLabels[key],
      score,
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      checks,
    };
  });

  const total = dimensions.reduce((sum, d) => sum + d.score, 0);
  const maxTotal = dimensions.reduce((sum, d) => sum + d.maxScore, 0);
  const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  const aiVisibility = percentage;

  const bandInfo = getBandInfo(aiVisibility);
  const webHealthPercentage = webHealth?.status === 'complete' ? webHealth.percentage : null;

  // Pillar-level weighted overall (without mentions - not available at scan time)
  const perfPillar = webHealth?.pillars?.find(p => p.key === 'performance');
  const trustPillar = webHealth?.pillars?.find(p => p.key === 'security');
  const perfScore = perfPillar?.percentage ?? null;
  const trustScore = trustPillar?.percentage ?? null;

  let overall: number | null;
  if (perfScore !== null && trustScore !== null) {
    // AI Visibility (1.0) + Performance (0.5) + Trust (0.5) = weight sum 2.0
    overall = Math.round((aiVisibility * 1.0 + perfScore * 0.5 + trustScore * 0.5) / 2.0);
  } else if (webHealthPercentage !== null) {
    // Fallback: use aggregate web health at half weight
    overall = Math.round((aiVisibility * 1.0 + webHealthPercentage * 0.5) / 1.5);
  } else {
    overall = null;
  }

  const overallBandInfo = getBandInfo(overall ?? aiVisibility);

  const webChecks = webHealth?.pillars.flatMap((pillar) => pillar.checks) || [];
  const fixes = prioritizeFixes([...allChecks, ...webChecks], { url: data.url });
  const potentialLiftBase = overall ?? aiVisibility;
  const potentialLift = Math.max(0, 100 - potentialLiftBase);

  return {
    total,
    maxTotal,
    percentage: aiVisibility,
    band: bandInfo.band,
    bandInfo,
    overallBand: overallBandInfo.band,
    overallBandInfo,
    dimensions,
    fixes,
    scores: {
      aiVisibility,
      webHealth: webHealthPercentage,
      overall,
      potentialLift,
    },
    webHealth,
  };
}

export function getBandInfo(percentage: number): ScoreBandInfo {
  return bands.find((b) => percentage >= b.min && percentage <= b.max) || bands[bands.length - 1];
}
