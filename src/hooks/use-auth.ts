'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthSessionState, AuthUser } from '@/types/auth';
import { invalidatePlanCache } from '@/hooks/use-plan';
import { hydratePlanCache } from '@/lib/plan-cache';
import { setClientStorageScope } from '@/lib/client-storage-scope';
import { clearClientAuthMeCache, fetchClientAuthMe } from '@/lib/client-auth-me';

const REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes (before 1hr token expiry)
const BROADCAST_CHANNEL_NAME = 'aiso_auth';
let lastKnownAuthEmail: string | null = null;
let refreshPromise: Promise<void> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let authSubscriberCount = 0;

interface AuthSnapshot {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const listeners = new Set<() => void>();
let authSnapshot: AuthSnapshot = {
  user: null,
  loading: true,
  initialized: false,
};

function emitAuthSnapshot(next: Partial<AuthSnapshot>) {
  authSnapshot = { ...authSnapshot, ...next };
  listeners.forEach((listener) => listener());
}

function getAuthSnapshot() {
  return authSnapshot;
}

function subscribeToAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function applySignedOutState() {
  lastKnownAuthEmail = null;
  setClientStorageScope(null);
  clearClientAuthMeCache();
  invalidatePlanCache();
  emitAuthSnapshot({ user: null, loading: false, initialized: true });
}

async function refreshAuthSnapshot() {
  if (!refreshPromise) {
    emitAuthSnapshot({ loading: !authSnapshot.initialized });

    refreshPromise = (async () => {
      try {
        const { ok, status, payload } = await fetchClientAuthMe<AuthSessionState>();

        // Only clear user on definitive auth failures, not transient errors.
        if (!ok && status >= 500) {
          return;
        }

        if (!payload) {
          return;
        }

        if (payload.reason === 'no_session' || payload.reason === 'refresh_failed') {
          applySignedOutState();
          return;
        }

        const nextEmail = payload.user?.email ?? null;
        const nextStorageScope = payload.user?.id ?? nextEmail;
        if (lastKnownAuthEmail !== null && nextEmail !== lastKnownAuthEmail) {
          invalidatePlanCache();
        }
        hydratePlanCache(payload);
        lastKnownAuthEmail = nextEmail;
        setClientStorageScope(nextStorageScope);
        emitAuthSnapshot({
          user: payload.user ?? null,
          loading: false,
          initialized: true,
        });
      } catch {
        // Network/fetch error is transient. Keep current user state if present.
      } finally {
        emitAuthSnapshot({ loading: false, initialized: true });
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

function startAuthRefreshTimer() {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    void refreshAuthSnapshot();
  }, REFRESH_INTERVAL_MS);
}

function stopAuthRefreshTimerIfIdle() {
  if (authSubscriberCount > 0 || !refreshTimer) return;
  clearInterval(refreshTimer);
  refreshTimer = null;
}

export function useAuth(): AuthState {
  const router = useRouter();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const snapshot = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getAuthSnapshot,
  );

  const refresh = useCallback(async () => {
    await refreshAuthSnapshot();
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    applySignedOutState();

    // Broadcast logout to other tabs
    try {
      channelRef.current?.postMessage({ type: 'logout' });
    } catch { /* channel may be closed */ }

    router.push('/login');
  }, [router]);

  // Initial auth check. A loaded auth snapshot is reused across route changes.
  useEffect(() => {
    authSubscriberCount += 1;
    startAuthRefreshTimer();

    if (!authSnapshot.initialized) {
      void refresh();
    }

    return () => {
      authSubscriberCount = Math.max(0, authSubscriberCount - 1);
      stopAuthRefreshTimerIfIdle();
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
          applySignedOutState();
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

  return { user: snapshot.user, loading: snapshot.loading, refresh, logout };
}
