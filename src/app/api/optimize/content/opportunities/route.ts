import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { getContentOpportunities } from '@/lib/optimize/content-opportunities';
import { getContentStudioUsage, ensureOwnedDomain } from '@/lib/optimize/shared';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const domain = await ensureOwnedDomain(user.id, request.nextUrl.searchParams.get('domain'));
  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  try {
    const [access, usage, opportunities] = await Promise.all([
      getUserAccess(user.id, user.email),
      getContentStudioUsage(user.id),
      getContentOpportunities(user.id, domain),
    ]);

    return NextResponse.json({
      opportunities: opportunities.slice(0, 20),
      usage: {
        briefsUsed: usage.briefsUsed,
        briefsLimit: access.maxContentStudioBriefs,
        draftsUsed: usage.draftsUsed,
        draftsLimit: access.maxContentStudioDrafts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load content opportunities' },
      { status: 500 },
    );
  }
}
