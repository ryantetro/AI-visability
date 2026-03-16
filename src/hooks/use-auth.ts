'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const payload = await res.json();

      if (res.ok && payload.user) {
        setUser(payload.user);
        return;
      }

      // Token invalid/expired — try refresh
      if (res.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshRes.ok) {
          // Retry /me with the new access token cookie
          const retryRes = await fetch('/api/auth/me', { cache: 'no-store' });
          const retryPayload = await retryRes.json();
          setUser(retryPayload.user ?? null);
          return;
        }
      }

      // No session or refresh failed
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { user, loading, refresh, logout };
}
