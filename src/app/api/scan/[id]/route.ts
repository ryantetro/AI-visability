import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';
import { estimateRemainingSeconds } from '@/lib/scan-eta';
import { ScoreResult } from '@/types/score';
import { serializeScoreResult } from '@/lib/report-serializer';
import type { CrawlData } from '@/types/crawler';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getDomain, getFaviconUrl } from '@/lib/url-utils';

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
    return NextResponse.json({ error: 'This scan belongs to another account.' }, { status: 403 });
  }

  const scoreResult = scan.scoreResult as ScoreResult | undefined;
  const estimatedRemainingSec = estimateRemainingSeconds(scan);

  const serializedScore = scoreResult ? serializeScoreResult(scoreResult) : null;
  const assetPreview = buildAssetPreview(scan);

  return NextResponse.json({
    id: scan.id,
    url: scan.url,
    status: scan.status,
    progress: scan.progress,
    enrichments: scan.enrichments,
    score: scan.status === 'complete' ? scoreResult?.percentage : undefined,
    scores: serializedScore?.scores,
    webHealth: scan.status === 'complete' ? serializedScore?.webHealth ?? null : null,
    dimensions: scan.status === 'complete' ? serializedScore?.dimensions ?? [] : [],
    previewFixes: scan.status === 'complete' ? scoreResult?.fixes?.slice(0, 3) ?? [] : [],
    band: scan.status === 'complete' ? scoreResult?.band : undefined,
    bandInfo: scan.status === 'complete' ? scoreResult?.bandInfo : undefined,
    assetPreview,
    mentionSummary: scan.mentionSummary ?? null,
    mentionScore: scan.mentionSummary ? (scan.mentionSummary as { overallScore?: number }).overallScore ?? null : null,
    hasEmail: !!scan.email,
    hasPaid: !!scan.paid,
    createdAt: scan.createdAt,
    completedAt: scan.completedAt,
    estimatedRemainingSec,
  });
}
