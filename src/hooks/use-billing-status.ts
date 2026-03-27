'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BillingStatus } from '@/lib/billing';

const BILLING_STATUS_INVALIDATED_EVENT = 'aiso:billing-status-invalidated';

function buildEmptyStatus(): BillingStatus | null {
  return null;
}

export function useBillingStatus() {
  const [status, setStatus] = useState<BillingStatus | null>(() => buildEmptyStatus());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/status', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load billing status');
      }
      const nextStatus = data as BillingStatus;
      setStatus(nextStatus);
      return nextStatus;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing status');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    if (typeof window === 'undefined') return;

    const handleInvalidation = () => {
      void refresh();
    };

    window.addEventListener(BILLING_STATUS_INVALIDATED_EVENT, handleInvalidation);
    return () => {
      window.removeEventListener(BILLING_STATUS_INVALIDATED_EVENT, handleInvalidation);
    };
  }, [refresh]);

  return {
    status,
    loading,
    error,
    refresh,
  };
}

export function invalidateBillingStatus() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BILLING_STATUS_INVALIDATED_EVENT));
}
