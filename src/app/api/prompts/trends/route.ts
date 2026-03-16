import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getPromptMonitoring } from '@/lib/services/registry';

export interface PositionTrendPoint {
  week: string;
  engine: string;
  avgPosition: number | null;
  mentionRate: number;
  totalChecks: number;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required.' }, { status: 400 });
  }

  const pm = getPromptMonitoring();

  try {
    const results = await pm.listPromptResults(domain, 500);

    // Group by week + engine
    const buckets = new Map<string, { positions: number[]; mentioned: number; total: number }>();

    for (const r of results) {
      const date = new Date(r.testedAt);
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
      const week = monday.toISOString().slice(0, 10);
      const key = `${week}::${r.engine}`;

      const bucket = buckets.get(key);
      if (bucket) {
        if (r.position !== null) bucket.positions.push(r.position);
        if (r.mentioned) bucket.mentioned++;
        bucket.total++;
      } else {
        buckets.set(key, {
          positions: r.position !== null ? [r.position] : [],
          mentioned: r.mentioned ? 1 : 0,
          total: 1,
        });
      }
    }

    const trends: PositionTrendPoint[] = Array.from(buckets.entries())
      .map(([key, data]) => {
        const [week, engine] = key.split('::');
        return {
          week,
          engine,
          avgPosition: data.positions.length > 0
            ? Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10
            : null,
          mentionRate: Math.round((data.mentioned / data.total) * 100),
          totalChecks: data.total,
        };
      })
      .sort((a, b) => a.week.localeCompare(b.week));

    return NextResponse.json({ trends });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch trends.' },
      { status: 500 }
    );
  }
}
