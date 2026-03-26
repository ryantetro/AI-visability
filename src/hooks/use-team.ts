'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Team, TeamMember, TeamInvitation } from '@/lib/team-management';

interface TeamState {
  team: Team | null;
  role: 'owner' | 'member' | null;
  members: TeamMember[];
  invitations: TeamInvitation[];
  seatCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTeam(): TeamState {
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<'owner' | 'member' | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [seatCount, setSeatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teams');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to load team');
        return;
      }
      setTeam(data.team ?? null);
      setRole(data.role ?? null);
      setMembers(data.members ?? []);
      setInvitations(data.invitations ?? []);
      setSeatCount(data.seatCount ?? 0);
    } catch {
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { team, role, members, invitations, seatCount, loading, error, refresh };
}
