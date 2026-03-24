import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getReferralVisits } from '@/lib/services/registry';
import type { SourceEngine } from '@/types/services';

const ENGINE_ORDER: SourceEngine[] = ['chatgpt', 'perplexity', 'gemini', 'claude'];

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
  const rv = getReferralVisits();

  try {
    const visits = await rv.listVisits(domain, days * 2);

    const now = Date.now();
    const currentCutoff = now - days * 86400000;

    const currentVisits = visits.filter(v => new Date(v.visitedAt).getTime() >= currentCutoff);
    const previousVisits = visits.filter(v => new Date(v.visitedAt).getTime() < currentCutoff);

    // Daily engine timeline
    const dayBuckets = new Map<string, Map<string, number>>();
    for (const v of currentVisits) {
      const dateStr = new Date(v.visitedAt).toISOString().slice(0, 10);
      if (!dayBuckets.has(dateStr)) dayBuckets.set(dateStr, new Map());
      const engineMap = dayBuckets.get(dateStr)!;
      engineMap.set(v.sourceEngine, (engineMap.get(v.sourceEngine) ?? 0) + 1);
    }

    // Zero-fill every day
    const startDate = new Date(currentCutoff);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setUTCHours(0, 0, 0, 0);

    const engineTimeline: Array<Record<string, string | number>> = [];
    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayData = dayBuckets.get(dateStr);
      const row: Record<string, string | number> = { date: dateStr };
      for (const e of ENGINE_ORDER) {
        row[e] = dayData?.get(e) ?? 0;
      }
      engineTimeline.push(row);
    }

    // Engine summaries with trend
    const currentByEngine = new Map<string, { count: number; pages: Set<string> }>();
    for (const v of currentVisits) {
      const existing = currentByEngine.get(v.sourceEngine);
      if (existing) {
        existing.count++;
        existing.pages.add(v.landingPage);
      } else {
        currentByEngine.set(v.sourceEngine, { count: 1, pages: new Set([v.landingPage]) });
      }
    }

    const previousByEngine = new Map<string, number>();
    for (const v of previousVisits) {
      previousByEngine.set(v.sourceEngine, (previousByEngine.get(v.sourceEngine) ?? 0) + 1);
    }

    const engineSummaries = ENGINE_ORDER
      .map(engine => {
        const current = currentByEngine.get(engine);
        const prevCount = previousByEngine.get(engine) ?? 0;
        const currentCount = current?.count ?? 0;
        const trend = prevCount > 0
          ? Math.round(((currentCount - prevCount) / prevCount) * 100)
          : currentCount > 0 ? 100 : 0;
        return {
          engine,
          visits: currentCount,
          trend,
          uniquePages: current?.pages.size ?? 0,
        };
      })
      .filter(s => s.visits > 0)
      .sort((a, b) => b.visits - a.visits);

    return NextResponse.json({
      engineTimeline,
      engineSummaries,
      totalVisits: currentVisits.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch referral visits.' },
      { status: 500 }
    );
  }
}
