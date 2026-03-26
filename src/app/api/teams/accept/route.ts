import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { acceptInvitation, getInvitationByToken } from '@/lib/team-management';
import { getOrCreateProfile } from '@/lib/user-profile';
import { getUserAccess } from '@/lib/access';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
  }

  try {
    // Look up the invitation to find the team owner for seat limit resolution
    const invitation = await getInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation is invalid, expired, or already used.' }, { status: 400 });
    }

    // Resolve the team owner's plan to get the current seat limit
    const supabase = getSupabaseClient();
    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', invitation.team_id)
      .single();

    let maxSeats = 3; // default to Pro limit
    if (team) {
      const ownerProfile = await getOrCreateProfile(team.owner_id, '');
      const ownerAccess = await getUserAccess(team.owner_id, ownerProfile.email);
      maxSeats = ownerAccess.maxSeats;
    }

    const { team: joinedTeam } = await acceptInvitation(token, user.id, maxSeats);
    return NextResponse.json({ ok: true, team: joinedTeam });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to accept invitation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
