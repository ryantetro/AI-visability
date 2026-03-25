import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { listCompetitors, updateCompetitorScan } from '@/lib/competitor-service';
import { getDatabase } from '@/lib/services/registry';
import type { CompetitorComparisonData, CompetitorWithScanData } from '@/types/competitors';
import type { MentionSummary } from '@/types/ai-mentions';
import type { ScoreResult } from '@/types/score';
import { normalizeMentionSummary } from '@/lib/ai-mentions/summary';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const rawDomain = request.nextUrl.searchParams.get('domain');
  if (!rawDomain) {
    return NextResponse.json({ error: 'domain query param is required' }, { status: 400 });
  }

  const domain = rawDomain.trim().toLowerCase();
  if (domain.length > 253) {
    return NextResponse.json({ error: 'domain must be 253 characters or fewer.' }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: 'domain format is invalid.' }, { status: 400 });
  }

  try {
    const competitors = await listCompetitors(user.id, domain);
    const db = getDatabase();

    // Enrich each competitor with scan data
    const enriched: CompetitorWithScanData[] = await Promise.all(
      competitors.map(async (comp) => {
        if (!comp.scanId) {
          return { ...comp, scanData: null };
        }

        const scan = await db.getScan(comp.scanId);
        if (!scan) {
          return { ...comp, scanData: null };
        }

        // Auto-correct stale status
        if (scan.status === 'complete' && comp.status === 'scanning') {
          await updateCompetitorScan(comp.id, comp.scanId, 'complete').catch(() => {});
          comp.status = 'complete';
        }
        if (scan.status === 'failed' && comp.status === 'scanning') {
          await updateCompetitorScan(comp.id, comp.scanId, 'failed').catch(() => {});
          comp.status = 'failed';
        }

        const scoreResult = scan.scoreResult as ScoreResult | undefined;
        const mentionSummary = normalizeMentionSummary(scan.mentionSummary as MentionSummary | undefined);

        return {
          ...comp,
          scanData: {
            overallScore: scoreResult?.percentage ?? null,
            aiVisibilityScore: mentionSummary?.overallScore ?? null,
            mentionSummary: mentionSummary ?? null,
            completedAt: scan.completedAt ?? null,
          },
        };
      })
    );

    // Get user's own latest scan for the domain (scoped to authenticated user)
    const userDomainScan = await db.findLatestScanByDomain(domain, user.email);
    const userScoreResult = userDomainScan?.scoreResult as ScoreResult | undefined;
    const userMentionSummary = normalizeMentionSummary(userDomainScan?.mentionSummary as MentionSummary | undefined);

    const result: CompetitorComparisonData = {
      userBrand: {
        domain,
        overallScore: userScoreResult?.percentage ?? 0,
        aiVisibilityScore: userMentionSummary?.overallScore ?? 0,
        mentionSummary: userMentionSummary ?? null,
      },
      competitors: enriched,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load competitors';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
