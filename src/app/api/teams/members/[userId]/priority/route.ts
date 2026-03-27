import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getTeamForUser, updateTeamMemberAccessRank } from '@/lib/team-management';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const teamInfo = await getTeamForUser(user.id);
  if (!teamInfo || teamInfo.role !== 'owner') {
    return NextResponse.json({ error: 'Only team owners can update seat priority' }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => ({}));
  const planAccessRank = Number(body.planAccessRank);

  if (!Number.isInteger(planAccessRank) || planAccessRank < 1) {
    return NextResponse.json({ error: 'planAccessRank must be a positive integer' }, { status: 400 });
  }

  try {
    await updateTeamMemberAccessRank(teamInfo.team.id, userId, planAccessRank);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update seat priority' },
      { status: 400 },
    );
  }
}
