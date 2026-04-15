'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BillingStatus } from '@/lib/billing';

const BILLING_STATUS_INVALIDATED_EVENT = 'aiso:billing-status-invalidated';
const BILLING_STATUS_CACHE_TTL_MS = 60 * 1000;

let billingStatusCache: {
  status: BillingStatus | null;
  error: string | null;
  cachedAt: number;
} | null = null;
let billingStatusRefreshPromise: Promise<BillingStatus | null> | null = null;

function buildEmptyStatus(): BillingStatus | null {
  return null;
}

export function useBillingStatus(options?: { enabled?: boolean; deferMs?: number }) {
  const enabled = options?.enabled ?? true;
  const deferMs = options?.deferMs ?? 0;
  const [status, setStatus] = useState<BillingStatus | null>(() => billingStatusCache?.status ?? buildEmptyStatus());
  const [loading, setLoading] = useState(() => enabled && !billingStatusCache);
  const [error, setError] = useState<string | null>(() => billingStatusCache?.error ?? null);

  const refresh = useCallback(async () => {
    if (billingStatusCache && Date.now() - billingStatusCache.cachedAt < BILLING_STATUS_CACHE_TTL_MS) {
      setStatus(billingStatusCache.status);
      setError(billingStatusCache.error);
      setLoading(false);
      return billingStatusCache.status;
    }

    if (!billingStatusRefreshPromise) {
      billingStatusRefreshPromise = (async () => {
        try {
          const res = await fetch('/api/billing/status', { cache: 'no-store' });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || 'Failed to load billing status');
          }
          const nextStatus = data as BillingStatus;
          billingStatusCache = { status: nextStatus, error: null, cachedAt: Date.now() };
          return nextStatus;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load billing status';
          billingStatusCache = { status: billingStatusCache?.status ?? null, error: message, cachedAt: Date.now() };
          return null;
        } finally {
          billingStatusRefreshPromise = null;
        }
      })();
    }

    setLoading(!billingStatusCache);
    setError(null);
    try {
      const nextStatus = await billingStatusRefreshPromise;
      setStatus(nextStatus);
      setError(billingStatusCache?.error ?? null);
      return nextStatus;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const triggerRefresh = () => {
      void refresh();
    };

    if (typeof window === 'undefined') return;

    const timer = deferMs > 0 && !billingStatusCache
      ? window.setTimeout(triggerRefresh, deferMs)
      : null;

    if (timer === null) {
      triggerRefresh();
    }

    const handleInvalidation = () => {
      void refresh();
    };

    window.addEventListener(BILLING_STATUS_INVALIDATED_EVENT, handleInvalidation);
    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      window.removeEventListener(BILLING_STATUS_INVALIDATED_EVENT, handleInvalidation);
    };
  }, [deferMs, enabled, refresh]);

  return {
    status,
    loading,
    error,
    refresh,
  };
}

export function invalidateBillingStatus() {
  if (typeof window === 'undefined') return;
  billingStatusCache = null;
  billingStatusRefreshPromise = null;
  window.dispatchEvent(new Event(BILLING_STATUS_INVALIDATED_EVENT));
}
