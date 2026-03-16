import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getCrawlerVisits } from '@/lib/services/registry';

/** GET — Authenticated dashboard query for crawler visit summaries. */
export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required.' }, { status: 400 });
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const cv = getCrawlerVisits();

  try {
    const [summaries, visits] = await Promise.all([
      cv.listVisitSummaries(domain, days),
      cv.listVisits(domain, days),
    ]);

    // Group visits by week for chart data
    const weekBuckets = new Map<string, Map<string, number>>();
    for (const v of visits) {
      const date = new Date(v.visitedAt);
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
      const week = monday.toISOString().slice(0, 10);

      if (!weekBuckets.has(week)) weekBuckets.set(week, new Map());
      const botMap = weekBuckets.get(week)!;
      botMap.set(v.botName, (botMap.get(v.botName) ?? 0) + 1);
    }

    const timeline = Array.from(weekBuckets.entries())
      .map(([week, bots]) => ({
        week,
        ...Object.fromEntries(bots),
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return NextResponse.json({ summaries, timeline, totalVisits: visits.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch crawler visits.' },
      { status: 500 }
    );
  }
}

/** POST — Internal endpoint called by middleware to log a bot visit. */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret');
  const expected = process.env.MONITORING_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { domain, botName, botCategory, pagePath, userAgent } = body ?? {};

  if (!domain || !botName || !pagePath) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const cv = getCrawlerVisits();
  await cv.logVisit({
    domain,
    botName,
    botCategory: botCategory || 'unknown',
    pagePath,
    userAgent: userAgent || null,
    responseCode: null,
  });

  return NextResponse.json({ ok: true });
}
