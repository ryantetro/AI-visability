import { getSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

function isMissingTeamStatusSchemaError(error: { message?: string | null } | null | undefined) {
  const message = error?.message ?? '';
  return message.includes('team_members.status')
    && message.includes('does not exist');
}

/* ── Types ──────────────────────────────────────────────────────── */

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'member';
  status: 'active' | 'suspended';
  plan_access_rank: number | null;
  joined_at: string;
  email?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  token: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'revoked';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface TeamForUser {
  team: Team;
  role: 'owner' | 'member';
}

/* ── Team CRUD ──────────────────────────────────────────────────── */

export async function createTeam(
  ownerId: string,
  _ownerEmail: string,
  name: string
): Promise<Team> {
  const supabase = getSupabaseClient();

  // App-level check (DB unique index on team_members.user_id is the real guard)
  const existing = await getTeamForUser(ownerId);
  if (existing) {
    throw new Error('You are already in a team. Leave or dissolve it first.');
  }

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ name, owner_id: ownerId })
    .select()
    .single();

  if (teamError || !team) {
    throw new Error(teamError?.message ?? 'Failed to create team');
  }

  // Insert the owner as a team member.
  // The UNIQUE index on team_members(user_id) prevents race conditions:
  // if two concurrent createTeam calls pass the app-level check above,
  // only one will succeed here.
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: ownerId, role: 'owner', plan_access_rank: 0 });

  if (memberError) {
    // Rollback team creation
    await supabase.from('teams').delete().eq('id', team.id);
    // Distinguish race condition from other errors
    if (memberError.code === '23505') {
      throw new Error('You are already in a team. Leave or dissolve it first.');
    }
    throw new Error(memberError.message ?? 'Failed to add owner as team member');
  }

  return team as Team;
}

export async function getTeamForUser(userId: string): Promise<TeamForUser | null> {
  const supabase = getSupabaseClient();

  let { data, error } = await supabase
    .from('team_members')
    .select('role, team_id, teams(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (error && isMissingTeamStatusSchemaError(error)) {
    const fallback = await supabase
      .from('team_members')
      .select('role, team_id, teams(*)')
      .eq('user_id', userId)
      .limit(1)
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) return null;

  const teamData = data.teams as unknown as Team;
  if (!teamData) return null;

  return {
    team: teamData,
    role: data.role as 'owner' | 'member',
  };
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const supabase = getSupabaseClient();

  let { data, error } = await supabase
    .from('team_members')
    .select('id, team_id, user_id, role, status, plan_access_rank, joined_at, user_profiles(email)')
    .eq('team_id', teamId)
    .eq('status', 'active')
    .order('plan_access_rank', { ascending: true, nullsFirst: false })
    .order('joined_at', { ascending: true });

  if (error && isMissingTeamStatusSchemaError(error)) {
    const fallback = await supabase
      .from('team_members')
      .select('id, team_id, user_id, role, plan_access_rank, joined_at, user_profiles(email)')
      .eq('team_id', teamId)
      .order('plan_access_rank', { ascending: true, nullsFirst: false })
      .order('joined_at', { ascending: true });
    data = fallback.data?.map((row) => ({ ...row, status: 'active' })) ?? null;
    error = fallback.error;
  }

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    team_id: row.team_id,
    user_id: row.user_id,
    role: row.role as 'owner' | 'member',
    status: (row.status as 'active' | 'suspended') ?? 'active',
    plan_access_rank: typeof row.plan_access_rank === 'number' ? row.plan_access_rank : null,
    joined_at: row.joined_at,
    email: (row.user_profiles as unknown as { email: string })?.email ?? undefined,
  }));
}

export async function getTeamMemberUserIds(teamId: string): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (error || !data) return [];
  return data.map((row) => row.user_id);
}

export async function getEffectiveUserIds(userId: string): Promise<string[]> {
  const teamInfo = await getTeamForUser(userId);
  if (!teamInfo) return [userId];
  return getTeamMemberUserIds(teamInfo.team.id);
}

/* ── Invitations ────────────────────────────────────────────────── */

export async function createInvitation(
  teamId: string,
  invitedByUserId: string,
  email: string
): Promise<TeamInvitation> {
  const supabase = getSupabaseClient();

  // Use cryptographically strong random token (higher entropy than UUID)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('team_invitations')
    .insert({
      team_id: teamId,
      email: email.toLowerCase(),
      token,
      invited_by: invitedByUserId,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create invitation');
  }

  return data as TeamInvitation;
}

export async function getInvitationByToken(token: string): Promise<TeamInvitation | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;
  return data as TeamInvitation;
}

export async function acceptInvitation(
  token: string,
  userId: string,
  maxSeats: number
): Promise<{ team: Team }> {
  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    throw new Error('Invitation is invalid, expired, or already used.');
  }

  // App-level check (DB unique index on team_members.user_id is the real guard)
  const existing = await getTeamForUser(userId);
  if (existing) {
    throw new Error('You are already in a team. Leave it first to accept this invitation.');
  }

  // Enforce seat limit at accept time (owner may have downgraded since invite was sent)
  const hasRoom = await canAddSeat(invitation.team_id, maxSeats);
  if (!hasRoom) {
    throw new Error('This team has reached its seat limit. Ask the team owner to upgrade.');
  }

  const supabase = getSupabaseClient();

  // Insert member — the UNIQUE index on team_members(user_id) prevents race conditions
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: invitation.team_id,
      user_id: userId,
      role: 'member',
      plan_access_rank: await getNextTeamMemberRank(invitation.team_id),
    });

  if (memberError) {
    if (memberError.code === '23505') {
      throw new Error('You are already in a team. Leave it first to accept this invitation.');
    }
    throw new Error(memberError.message ?? 'Failed to join team');
  }

  // Mark invitation as accepted
  await supabase
    .from('team_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  // Fetch team
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', invitation.team_id)
    .single();

  return { team: team as Team };
}

export async function revokeInvitation(invitationId: string, teamId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('team_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('team_id', teamId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(error.message ?? 'Failed to revoke invitation');
  }
}

export async function listPendingInvitations(teamId: string): Promise<TeamInvitation[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as TeamInvitation[];
}

/* ── Member management ──────────────────────────────────────────── */

export async function removeMember(teamId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Cannot remove the owner
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (!member) throw new Error('Member not found');
  if (member.role === 'owner') throw new Error('Cannot remove the team owner');

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message ?? 'Failed to remove member');
}

export async function leaveTeam(userId: string): Promise<void> {
  const teamInfo = await getTeamForUser(userId);
  if (!teamInfo) throw new Error('You are not in a team');
  if (teamInfo.role === 'owner') throw new Error('Team owner cannot leave. Dissolve the team instead.');

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamInfo.team.id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message ?? 'Failed to leave team');
}

export async function dissolveTeam(ownerId: string): Promise<void> {
  const teamInfo = await getTeamForUser(ownerId);
  if (!teamInfo) throw new Error('You are not in a team');
  if (teamInfo.role !== 'owner') throw new Error('Only the team owner can dissolve the team');

  const supabase = getSupabaseClient();
  const teamId = teamInfo.team.id;

  // Delete the team — ON DELETE CASCADE handles members and invitations
  const { error } = await supabase.from('teams').delete().eq('id', teamId);

  if (error) throw new Error(error.message ?? 'Failed to dissolve team');
}

/* ── Seat counting ──────────────────────────────────────────────── */

export async function getTeamSeatCount(teamId: string): Promise<number> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId);

  if (error) return 0;
  return count ?? 0;
}

export async function canAddSeat(teamId: string, maxSeats: number): Promise<boolean> {
  if (maxSeats === -1) return true; // unlimited

  // Count current members + pending invitations against the seat limit
  const currentMembers = await getTeamSeatCount(teamId);
  const pendingInvites = await listPendingInvitations(teamId);

  return (currentMembers + pendingInvites.length) < maxSeats;
}

export async function getNextTeamMemberRank(teamId: string): Promise<number> {
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from('team_members')
    .select('plan_access_rank')
    .eq('team_id', teamId)
    .order('plan_access_rank', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const currentMax = typeof data?.plan_access_rank === 'number' ? data.plan_access_rank : 0;
  return currentMax + 1;
}

export async function updateTeamMemberAccessRank(
  teamId: string,
  userId: string,
  planAccessRank: number,
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('team_members')
    .select('id, user_id, role, plan_access_rank, joined_at')
    .eq('team_id', teamId)
    .neq('role', 'owner')
    .order('plan_access_rank', { ascending: true, nullsFirst: false })
    .order('joined_at', { ascending: true });

  if (error || !data) throw new Error(error?.message ?? 'Failed to update team member priority');

  const members = data.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    role: row.role as 'member',
    plan_access_rank: typeof row.plan_access_rank === 'number' ? row.plan_access_rank : null,
    joined_at: row.joined_at,
  }));

  const target = members.find((member) => member.user_id === userId);
  if (!target) {
    throw new Error('Team member not found');
  }

  const ordered = members.filter((member) => member.user_id !== userId);
  const nextIndex = Math.max(0, Math.min(planAccessRank - 1, ordered.length));
  ordered.splice(nextIndex, 0, target);

  const updates = ordered.map((member, index) => (
    supabase
      .from('team_members')
      .update({ plan_access_rank: index + 1 })
      .eq('id', member.id)
  ));

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(failed.error.message ?? 'Failed to update team member priority');
  }
}
