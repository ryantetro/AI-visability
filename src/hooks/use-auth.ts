'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthSessionState, AuthUser } from '@/types/auth';
import { invalidatePlanCache } from '@/hooks/use-plan';
import { setClientStorageScope } from '@/lib/client-storage-scope';

const REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes (before 1hr token expiry)
const BROADCAST_CHANNEL_NAME = 'aiso_auth';
let lastKnownAuthEmail: string | null = null;

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
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const payload = await res.json() as AuthSessionState;

      // Only clear user on definitive auth failures, not transient errors
      if (!res.ok && res.status >= 500) {
        // Transient server error — keep current user state
        return;
      }

      if (payload.reason === 'no_session' || payload.reason === 'refresh_failed') {
        lastKnownAuthEmail = null;
        setClientStorageScope(null);
        invalidatePlanCache();
        setUser(null);
        return;
      }

      const nextEmail = payload.user?.email ?? null;
      if (nextEmail !== lastKnownAuthEmail) {
        invalidatePlanCache();
      }
      lastKnownAuthEmail = nextEmail;
      setClientStorageScope(nextEmail);
      setUser(payload.user ?? null);
    } catch {
      // Network/fetch error — transient, keep current user
      // Don't clear user state on network failures
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    lastKnownAuthEmail = null;
    setClientStorageScope(null);
    invalidatePlanCache();
    setUser(null);

    // Broadcast logout to other tabs
    try {
      channelRef.current?.postMessage({ type: 'logout' });
    } catch { /* channel may be closed */ }

    router.push('/login');
  }, [router]);

  // Initial auth check
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Background token refresh every 45 minutes
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refresh]);

  // Cross-tab sync via BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        const { type } = event.data ?? {};
        if (type === 'logout') {
          lastKnownAuthEmail = null;
          setClientStorageScope(null);
          invalidatePlanCache();
          setUser(null);
          router.push('/login');
        } else if (type === 'login') {
          // Another tab logged in — refresh our auth state
          void refresh();
        }
      };

      return () => {
        channel.close();
        channelRef.current = null;
      };
    } catch {
      // BroadcastChannel not supported or failed — degrade gracefully
    }
  }, [refresh, router]);

  return { user, loading, refresh, logout };
}
