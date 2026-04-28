import { NextRequest, NextResponse } from 'next/server';
import { buildPublicScoreSummaryFromScan, type PublicScoreScanLike } from '@/lib/public-score';
import { getDomain } from '@/lib/url-utils';
import { getAuthUserFromRequest } from '@/lib/auth';

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseFetch<T>(path: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Supabase debug query failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export async function GET(request: NextRequest) {
  // Gate: either a logged-in user session OR the monitoring secret
  const secret = process.env.MONITORING_SECRET;
  const provided = request.headers.get('x-internal-secret') || request.nextUrl.searchParams.get('secret');
  const hasSecret = Boolean(secret && provided === secret);

  if (!hasSecret) {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  const domainFilter = (searchParams.get('domain') || '').toLowerCase().trim();
  const scanId = searchParams.get('scanId');

  // 1) Fetch all scans for this domain OR a specific scan id
  let scans: Array<{
    id: string;
    url: string;
    status: string;
    completed_at: string | null;
    created_at: string | null;
    score_result: PublicScoreScanLike['scoreResult'];
    mention_summary: PublicScoreScanLike['mentionSummary'];
  }>;

  if (scanId) {
    scans = await supabaseFetch(
      `scans?id=eq.${encodeURIComponent(scanId)}&select=id,url,status,completed_at,created_at,score_result,mention_summary`
    );
  } else if (domainFilter) {
    scans = await supabaseFetch(
      `scans?url=ilike.${encodeURIComponent('%' + domainFilter + '%')}&select=id,url,status,completed_at,created_at,score_result,mention_summary&order=completed_at.desc.nullslast,created_at.desc`
    );
  } else {
    return NextResponse.json(
      { error: 'Provide ?domain=<substring> or ?scanId=<id>' },
      { status: 400 }
    );
  }

  // 2) Simulate the leaderboard candidate pool (same query as listLeaderboardCandidateScans)
  const candidatePool = await supabaseFetch<
    Array<{ id: string; url: string; completed_at: string | null }>
  >(
    `scans?status=eq.complete&limit=200&order=completed_at.desc.nullslast,created_at.desc&select=id,url,completed_at`
  );

  const candidateIds = new Set(candidatePool.map((c) => c.id));

  // 3) Analyze each scan
  const analyzed = scans.map((row) => {
    const scanLike: PublicScoreScanLike = {
      id: row.id,
      url: row.url,
      status: row.status as PublicScoreScanLike['status'],
      completedAt: row.completed_at ? Date.parse(row.completed_at) : undefined,
      scoreResult: row.score_result ?? undefined,
      mentionSummary: row.mention_summary ?? undefined,
    };

    const summary = buildPublicScoreSummaryFromScan(scanLike);

    const dropReason: string[] = [];
    if (scanLike.status !== 'complete') dropReason.push(`status=${scanLike.status}`);
    if (!scanLike.completedAt) dropReason.push('no completed_at');
    if (!scanLike.scoreResult) dropReason.push('no score_result');

    return {
      id: row.id,
      url: row.url,
      domain: getDomain(row.url),
      status: row.status,
      completed_at: row.completed_at,
      created_at: row.created_at,
      has_score_result: Boolean(row.score_result),
      has_mention_summary: Boolean(row.mention_summary),
      inCandidatePool: candidateIds.has(row.id),
      buildsSummary: Boolean(summary),
      dropReason: dropReason.length ? dropReason : null,
      percentage: summary?.percentage ?? null,
      aiVisibility: summary?.aiVisibility ?? null,
      webHealth: summary?.webHealth ?? null,
      mentionScore: summary?.mentionScore ?? null,
    };
  });

  // 4) Which one would win on the leaderboard?
  const domainGroups = new Map<string, typeof analyzed>();
  for (const row of analyzed) {
    if (!row.inCandidatePool || !row.buildsSummary) continue;
    const list = domainGroups.get(row.domain) ?? [];
    list.push(row);
    domainGroups.set(row.domain, list);
  }
  const leaderboardWinners = Array.from(domainGroups.entries()).map(([domain, rows]) => {
    const sorted = [...rows].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
    return { domain, winningScanId: sorted[0].id, winningScore: sorted[0].percentage };
  });

  return NextResponse.json(
    {
      query: { domain: domainFilter || null, scanId: scanId || null },
      candidatePoolSize: candidatePool.length,
      candidatePoolOldestCompletedAt: candidatePool[candidatePool.length - 1]?.completed_at ?? null,
      scans: analyzed,
      leaderboardWinnersInThisDomain: leaderboardWinners,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
