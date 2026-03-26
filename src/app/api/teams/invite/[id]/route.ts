import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getTeamForUser, revokeInvitation } from '@/lib/team-management';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const teamInfo = await getTeamForUser(user.id);
  if (!teamInfo || teamInfo.role !== 'owner') {
    return NextResponse.json({ error: 'Only team owners can revoke invitations' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await revokeInvitation(id, teamInfo.team.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to revoke invitation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
