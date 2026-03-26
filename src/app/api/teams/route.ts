import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import {
  createTeam,
  getTeamForUser,
  getTeamMembers,
  listPendingInvitations,
  getTeamSeatCount,
} from '@/lib/team-management';

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const teamInfo = await getTeamForUser(user.id);
  if (!teamInfo) {
    return NextResponse.json({ team: null });
  }

  const [members, invitations, seatCount] = await Promise.all([
    getTeamMembers(teamInfo.team.id),
    teamInfo.role === 'owner' ? listPendingInvitations(teamInfo.team.id) : Promise.resolve([]),
    getTeamSeatCount(teamInfo.team.id),
  ]);

  return NextResponse.json({
    team: teamInfo.team,
    role: teamInfo.role,
    members,
    invitations,
    seatCount,
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const access = await getUserAccess(user.id, user.email);
  if (!access.canAccessFeature('multi_seat')) {
    return NextResponse.json(
      { error: 'Team management requires a Pro or Growth plan.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }
  if (name.length > 50) {
    return NextResponse.json({ error: 'Team name must be 50 characters or less' }, { status: 400 });
  }

  try {
    const team = await createTeam(user.id, user.email, name);
    return NextResponse.json({ team, role: 'owner' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create team';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
