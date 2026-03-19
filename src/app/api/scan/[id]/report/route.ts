import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/services/registry';
import { buildReportPromptBundle } from '@/lib/llm-prompts';
import { buildSharePayload, serializeScoreResult } from '@/lib/report-serializer';
import { ScoreResult } from '@/types/score';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getDomain, getFaviconUrl } from '@/lib/url-utils';
import { normalizeMentionSummary } from '@/lib/ai-mentions/summary';
import type { MentionSummary } from '@/types/ai-mentions';
import type { CrawlData } from '@/types/crawler';

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
    return NextResponse.json({ error: 'This report belongs to another account.' }, { status: 403 });
  }

  if (scan.status !== 'complete') {
    return NextResponse.json({ error: 'Scan not complete' }, { status: 400 });
  }

  const scoreResult = scan.scoreResult as ScoreResult;
  const copyToLlm = buildReportPromptBundle(scan.url, scoreResult);
  const score = serializeScoreResult(scoreResult);
  const mentionSummary = normalizeMentionSummary(scan.mentionSummary as MentionSummary | null | undefined);
  const assetPreview = buildAssetPreview(scan);

  // Derive hasPaid from plan-based access OR legacy scan.paid flag
  let hasPaid = !!scan.paid;
  try {
    const access = await getUserAccess(user.id, user.email);
    hasPaid = access.isPaid || hasPaid;
  } catch {
    // Profile lookup failed — fall back to legacy scan.paid check
  }

  return NextResponse.json({
    id: scan.id,
    url: scan.url,
    score,
    webHealth: score.webHealth,
    fixes: score.fixes,
    scores: score.scores,
    copyToLlm,
    share: buildSharePayload(scan.id),
    enrichments: scan.enrichments,
    mentionSummary,
    assetPreview,
    hasPaid,
  });
}
