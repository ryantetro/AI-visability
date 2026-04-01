import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import {
  buildActionPreviewRecords,
  buildOptimizationActionDrafts,
  computeActionProgress,
  listStoredOptimizationActions,
} from '@/lib/optimize/actions';
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

  try {
    const access = await getUserAccess(user.id, user.email);
    const storedActions = await listStoredOptimizationActions(user.id, domain);

    const actions = storedActions.length > 0
      ? storedActions
      : buildActionPreviewRecords(
          await buildOptimizationActionDrafts(user.id, domain, { includeSourceGaps: true }),
        );

    const limited = !access.canAccessFeature('action_plan_full');
    const visibleActions = limited ? actions.slice(0, 3) : actions;

    return NextResponse.json({
      actions: visibleActions,
      progress: computeActionProgress(visibleActions),
      limited,
      readOnly: limited || visibleActions.some((action) => action.id === null),
      fromPreview: storedActions.length === 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load optimization actions' },
      { status: 500 },
    );
  }
}
