import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserAccess } from '@/lib/access';
import {
  getTeamForUser,
  createInvitation,
  canAddSeat,
  getTeamMembers,
  listPendingInvitations,
} from '@/lib/team-management';
import { sendTeamInvitationEmail } from '@/lib/services/resend-alerts';

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const teamInfo = await getTeamForUser(user.id);
  if (!teamInfo || teamInfo.role !== 'owner') {
    return NextResponse.json({ error: 'Only team owners can invite members' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
  }

  const access = await getUserAccess(user.id, user.email);

  // Check seat limit
  const hasRoom = await canAddSeat(teamInfo.team.id, access.maxSeats);
  if (!hasRoom) {
    return NextResponse.json(
      { error: `Your plan allows ${access.maxSeats === -1 ? 'unlimited' : access.maxSeats} seats. Upgrade for more.` },
      { status: 403 }
    );
  }

  // Check if email is already a member
  const members = await getTeamMembers(teamInfo.team.id);
  if (members.some((m) => m.email?.toLowerCase() === email)) {
    return NextResponse.json({ error: 'This user is already a team member' }, { status: 400 });
  }

  // Check if there's already a pending invitation for this email
  const pending = await listPendingInvitations(teamInfo.team.id);
  if (pending.some((inv) => inv.email === email)) {
    return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 400 });
  }

  try {
    const invitation = await createInvitation(teamInfo.team.id, user.id, email);

    // Send invitation email
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://aiso.so').replace(/\/$/, '');
    const acceptUrl = `${appUrl}/teams/accept?token=${invitation.token}`;
    try {
      await sendTeamInvitationEmail({
        recipientEmail: email,
        inviterName: user.email,
        teamName: teamInfo.team.name,
        acceptUrl,
      });
    } catch (emailErr) {
      console.warn('[Teams] Failed to send invitation email:', emailErr);
      // Don't fail the invitation if email fails — the invite is still valid via link
    }

    return NextResponse.json({ invitation });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send invitation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
