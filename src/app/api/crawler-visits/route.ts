import { NextRequest, NextResponse } from 'next/server';
import { AI_CRAWLER_PROVIDER_ORDER, getCrawlerProvider } from '@/lib/ai-crawlers';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getCrawlerVisits } from '@/lib/services/registry';
import { getSupabaseClient } from '@/lib/supabase';

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

  // Verify the user has deployed a tracking script for this domain
  const supabase = getSupabaseClient();
  const { data: trackingKey } = await supabase
    .from('site_tracking_keys')
    .select('id')
    .eq('user_id', user.id)
    .eq('domain', domain.toLowerCase())
    .maybeSingle();

  if (!trackingKey) {
    return NextResponse.json(
      { error: 'No tracking script found for this domain. Generate and deploy your tracking script first.' },
      { status: 403 }
    );
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const cv = getCrawlerVisits();

  try {
    // Fetch double the period for trend comparison, plus accurate total count
    const [summaries, visits, totalVisitCount] = await Promise.all([
      cv.listVisitSummaries(domain, days),
      cv.listVisits(domain, days * 2),
      cv.countVisits(domain, days),
    ]);

    const now = Date.now();
    const currentCutoff = now - days * 86400000;

    // Split into current and previous periods
    const currentVisits = visits.filter(v => new Date(v.visitedAt).getTime() >= currentCutoff);
    const previousVisits = visits.filter(v => new Date(v.visitedAt).getTime() < currentCutoff);

    // --- Legacy weekly timeline (backward compat) ---
    const weekBuckets = new Map<string, Map<string, number>>();
    for (const v of currentVisits) {
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

    // --- Provider daily timeline ---
    const dayBuckets = new Map<string, Map<string, number>>();
    for (const v of currentVisits) {
      const dateStr = new Date(v.visitedAt).toISOString().slice(0, 10);
      const provider = getCrawlerProvider(v.botName);
      if (!dayBuckets.has(dateStr)) dayBuckets.set(dateStr, new Map());
      const provMap = dayBuckets.get(dateStr)!;
      provMap.set(provider, (provMap.get(provider) ?? 0) + 1);
    }

    // Zero-fill every day in the range
    const allProviders = AI_CRAWLER_PROVIDER_ORDER;
    const startDate = new Date(currentCutoff);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setUTCHours(0, 0, 0, 0);

    const providerTimeline: Array<Record<string, string | number>> = [];
    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayData = dayBuckets.get(dateStr);
      const row: Record<string, string | number> = { date: dateStr };
      for (const p of allProviders) {
        row[p] = dayData?.get(p) ?? 0;
      }
      providerTimeline.push(row);
    }

    // --- Provider summaries with trend ---
    const currentByProvider = new Map<string, { count: number; paths: Set<string> }>();
    for (const v of currentVisits) {
      const provider = getCrawlerProvider(v.botName);
      const existing = currentByProvider.get(provider);
      if (existing) {
        existing.count++;
        existing.paths.add(v.pagePath);
      } else {
        currentByProvider.set(provider, { count: 1, paths: new Set([v.pagePath]) });
      }
    }

    const previousByProvider = new Map<string, number>();
    for (const v of previousVisits) {
      const provider = getCrawlerProvider(v.botName);
      previousByProvider.set(provider, (previousByProvider.get(provider) ?? 0) + 1);
    }

    const providerSummaries = allProviders
      .map(provider => {
        const current = currentByProvider.get(provider);
        const prevCount = previousByProvider.get(provider) ?? 0;
        const currentCount = current?.count ?? 0;
        const trend = prevCount > 0
          ? Math.round(((currentCount - prevCount) / prevCount) * 100)
          : currentCount > 0 ? 100 : 0;
        return {
          provider,
          visits: currentCount,
          trend,
          uniquePaths: current?.paths.size ?? 0,
        };
      })
      .filter(s => s.visits > 0)
      .sort((a, b) => b.visits - a.visits);

    return NextResponse.json({
      summaries,
      timeline,
      totalVisits: totalVisitCount,
      providerTimeline,
      providerSummaries,
    });
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

  if (typeof domain === 'string' && domain.length > 253) {
    return NextResponse.json({ error: 'domain must be 253 characters or fewer.' }, { status: 400 });
  }
  if (typeof botName === 'string' && botName.length > 100) {
    return NextResponse.json({ error: 'botName must be 100 characters or fewer.' }, { status: 400 });
  }
  if (typeof pagePath === 'string' && pagePath.length > 2048) {
    return NextResponse.json({ error: 'pagePath must be 2048 characters or fewer.' }, { status: 400 });
  }
  if (userAgent !== undefined && userAgent !== null && typeof userAgent === 'string' && userAgent.length > 500) {
    return NextResponse.json({ error: 'userAgent must be 500 characters or fewer.' }, { status: 400 });
  }

  const VALID_BOT_CATEGORIES = ['indexing', 'citation', 'training', 'unknown'];
  const resolvedBotCategory = VALID_BOT_CATEGORIES.includes(botCategory) ? botCategory : 'unknown';

  const cv = getCrawlerVisits();
  await cv.logVisit({
    domain,
    botName,
    botCategory: resolvedBotCategory,
    pagePath,
    userAgent: userAgent || null,
    responseCode: null,
  });

  return NextResponse.json({ ok: true });
}
