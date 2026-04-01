import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getSourceEcosystemAnalysis } from '@/lib/optimize/sources';
import { ensureOwnedDomain } from '@/lib/optimize/shared';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const domain = await ensureOwnedDomain(user.id, request.nextUrl.searchParams.get('domain'));
  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('source_ecosystem')) {
    return NextResponse.json(
      { error: 'Source ecosystem analysis requires the Starter plan or above.' },
      { status: 403 },
    );
  }

  try {
    const analysis = await getSourceEcosystemAnalysis(user.id, domain);
    const includeGaps = access.canAccessFeature('source_gaps');

    return NextResponse.json({
      ...analysis,
      topSources: includeGaps ? analysis.topSources : analysis.topSources.slice(0, 10),
      gaps: includeGaps ? analysis.gaps : [],
      perEngine: access.tier === 'growth' ? analysis.perEngine : {},
      limited: !includeGaps,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load source ecosystem analysis' },
      { status: 500 },
    );
  }
}
