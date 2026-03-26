import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getTeamForUser, removeMember } from '@/lib/team-management';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const teamInfo = await getTeamForUser(user.id);
  if (!teamInfo || teamInfo.role !== 'owner') {
    return NextResponse.json({ error: 'Only team owners can remove members' }, { status: 403 });
  }

  const { userId } = await params;

  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself. Dissolve the team instead.' }, { status: 400 });
  }

  try {
    await removeMember(teamInfo.team.id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove member';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
