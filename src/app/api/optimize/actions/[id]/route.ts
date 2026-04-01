import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import { updateOptimizationActionStatus } from '@/lib/optimize/actions';
import type { OptimizationActionStatus } from '@/lib/optimize/types';

const VALID_STATUSES = new Set<OptimizationActionStatus>(['pending', 'in_progress', 'completed', 'dismissed']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('action_plan_full')) {
    return NextResponse.json(
      { error: 'Updating actions requires the Starter plan or above.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || !VALID_STATUSES.has(body.status as OptimizationActionStatus)) {
    return NextResponse.json({ error: 'A valid status is required' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const action = await updateOptimizationActionStatus(user.id, id, body.status as OptimizationActionStatus);

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    return NextResponse.json({ action });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update action status' },
      { status: 500 },
    );
  }
}
