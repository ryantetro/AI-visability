import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';
import { buildReportPromptBundle } from '@/lib/llm-prompts';
import { buildSharePayload, serializeScoreResult } from '@/lib/report-serializer';
import { ScoreResult } from '@/types/score';
import type { MentionSummary } from '@/types/ai-mentions';
import type { WebHealthSummary } from '@/types/score';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getDomain, getFaviconUrl } from '@/lib/url-utils';
import type { CrawlData } from '@/types/crawler';
import { estimateRemainingSeconds } from '@/lib/scan-eta';
import { resolveScanState } from '@/lib/scan-state';

interface PreviewHomepageData {
  assetUrls?: string[];
  ogTags?: Record<string, string>;
  twitterTags?: Record<string, string>;
}

function buildAssetPreview(scan: { url: string; crawlData?: unknown }) {
  const crawlData = scan.crawlData as CrawlData | undefined;
  const homepage = crawlData?.homepage as PreviewHomepageData | undefined;
  const domain = getDomain(scan.url);
  const fallbackFavicon = domain ? getFaviconUrl(domain, 96) : null;

  return {
    faviconUrl:
      homepage?.assetUrls?.find((url: string) => /favicon|apple-touch-icon|icon/i.test(url)) ??
      fallbackFavicon,
    ogTitle: homepage?.ogTags?.['og:title'] || null,
    ogDescription: homepage?.ogTags?.['og:description'] || null,
    ogImageUrl: homepage?.ogTags?.['og:image'] || null,
    ogUrl: homepage?.ogTags?.['og:url'] || null,
    twitterCard: homepage?.twitterTags?.['twitter:card'] || null,
    twitterTitle: homepage?.twitterTags?.['twitter:title'] || null,
    twitterDescription: homepage?.twitterTags?.['twitter:description'] || null,
    twitterImageUrl:
      homepage?.twitterTags?.['twitter:image'] ||
      homepage?.twitterTags?.['twitter:image:src'] ||
      null,
  };
}

function buildFreeWebHealthSummary(webHealth: WebHealthSummary | null | undefined): WebHealthSummary | null {
  if (!webHealth) {
    return null;
  }

  return {
    ...webHealth,
    metrics: [],
    pillars: webHealth.pillars.map((pillar) => ({
      ...pillar,
      checks: [],
    })),
  };
}

function buildFreeMentionSummary(mentionSummary: MentionSummary | null | undefined): MentionSummary | null {
  if (!mentionSummary) {
    return null;
  }

  return {
    ...mentionSummary,
    results: [],
    promptsUsed: [],
    competitorsMentioned: [],
    inferredCompetitors: undefined,
    competitorDiscovery: undefined,
    shareOfVoice: undefined,
    sentimentSummary: undefined,
    topicPerformance: undefined,
    competitorLeaderboard: undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const db = getDatabase();
  const scan = await db.getScan(id);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  if (!scan.email || scan.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'This report belongs to another account.' }, { status: 403 });
  }

  const assetPreview = buildAssetPreview(scan);
  const { progress, mentionSummary, enrichments } = resolveScanState(scan);

  if (scan.status === 'failed') {
    return NextResponse.json({
      error: progress.error || 'Scan failed',
      failed: true,
      status: scan.status,
      progress,
      enrichments,
      assetPreview,
    }, { status: 409 });
  }

  if (scan.status !== 'complete') {
    return NextResponse.json({
      error: 'Scan not complete',
      pending: true,
      status: scan.status,
      progress,
      enrichments,
      assetPreview,
      estimatedRemainingSec: estimateRemainingSeconds({
        ...scan,
        progress,
        enrichments,
      }),
    }, { status: 202 });
  }

  const scoreResult = scan.scoreResult as ScoreResult;
  const score = serializeScoreResult(scoreResult);
  const normalizedScanUrl = scan.normalizedUrl || scan.url;
  const freeWebHealth = buildFreeWebHealthSummary(score.webHealth);
  const freeMentionSummary = buildFreeMentionSummary(mentionSummary);

  // Derive hasPaid from plan-based access OR legacy scan.paid flag
  let hasPaid = !!scan.paid;
  try {
    const access = await getUserAccess(user.id, user.email);
    hasPaid = access.isPaid || hasPaid;
  } catch {
    // Profile lookup failed — fall back to legacy scan.paid check
  }

  const previewFixes = score.fixes.slice(0, 3);
  const gatedScore = hasPaid
    ? score
    : {
        ...score,
        fixes: previewFixes,
        dimensions: [],
        webHealth: freeWebHealth,
      };

  return NextResponse.json({
    id: scan.id,
    url: normalizedScanUrl,
    score: gatedScore,
    webHealth: hasPaid ? score.webHealth : freeWebHealth,
    fixes: hasPaid ? score.fixes : previewFixes,
    scores: score.scores,
    copyToLlm: hasPaid ? buildReportPromptBundle(normalizedScanUrl, scoreResult) : null,
    share: buildSharePayload(scan.id),
    enrichments,
    mentionSummary: hasPaid ? mentionSummary : freeMentionSummary,
    assetPreview: hasPaid ? assetPreview : null,
    hasPaid,
  });
}
