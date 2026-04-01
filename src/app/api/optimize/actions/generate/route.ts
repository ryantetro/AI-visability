import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { computeActionProgress, refreshOptimizationActions } from '@/lib/optimize/actions';
import { ensureOwnedDomain } from '@/lib/optimize/shared';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const domain = await ensureOwnedDomain(user.id, body?.domain);
  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('action_plan_full')) {
    return NextResponse.json(
      { error: 'Action plan generation requires the Starter plan or above.' },
      { status: 403 },
    );
  }

  try {
    const actions = await refreshOptimizationActions(user.id, domain, {
      includeSourceGaps: access.canAccessFeature('action_plan_autogen'),
    });

    return NextResponse.json({
      actions,
      progress: computeActionProgress(actions),
      limited: false,
      readOnly: actions.some((action) => action.id === null),
      fromPreview: actions.some((action) => action.preview),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate optimization actions' },
      { status: 500 },
    );
  }
}
