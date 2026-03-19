import { NextRequest, NextResponse } from 'next/server';
import { listLeaderboardEntriesFiltered } from '@/lib/public-proof';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const timeFilter = searchParams.get('filter') as 'all' | '24h' | '30d' | null;
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 200);

  const validFilter = timeFilter === '24h' || timeFilter === '30d' ? timeFilter : 'all';

  const entries = await listLeaderboardEntriesFiltered(limit, validFilter);

  const mapped = entries.map(({ rank, summary, profile }) => ({
    rank,
    domain: summary.domain,
    url: summary.url,
    overall: summary.percentage,
    aiVisibility: summary.aiVisibility,
    webHealth: summary.webHealth,
    mentionScore: summary.mentionScore,
    completedAt: summary.completedAt,
    hasCertified: profile.verified && profile.enabled,
  }));

  return NextResponse.json(mapped, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
