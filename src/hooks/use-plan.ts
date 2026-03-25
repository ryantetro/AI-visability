'use client';

import { useCallback, useEffect, useState } from 'react';
import { type PlanTier } from '@/lib/pricing';
import {
  clearPlanCache,
  getPlanCacheSnapshot,
  refreshPlanCache,
} from '@/lib/plan-cache';

interface PlanState {
  tier: PlanTier;
  plan: string;
  isPaid: boolean;
  maxDomains: number;
  maxPrompts: number;
  email: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PLAN_CACHE_INVALIDATED_EVENT = 'aiso:plan-cache-invalidated';

function readPlanSnapshot() {
  const snapshot = getPlanCacheSnapshot();

  return {
    tier: snapshot.tier ?? 'free',
    plan: snapshot.plan ?? 'free',
    isPaid: snapshot.isPaid ?? false,
    maxDomains: snapshot.maxDomains ?? 1,
    maxPrompts: snapshot.maxPrompts ?? 5,
    email: snapshot.email ?? '',
    loading: snapshot.tier === null,
  };
}

export function usePlan(): PlanState {
  const [tier, setTier] = useState<PlanTier>(() => readPlanSnapshot().tier);
  const [plan, setPlan] = useState<string>(() => readPlanSnapshot().plan);
  const [isPaid, setIsPaid] = useState<boolean>(() => readPlanSnapshot().isPaid);
  const [maxDomains, setMaxDomains] = useState<number>(() => readPlanSnapshot().maxDomains);
  const [maxPrompts, setMaxPrompts] = useState<number>(() => readPlanSnapshot().maxPrompts);
  const [email, setEmail] = useState<string>(() => readPlanSnapshot().email);
  const [loading, setLoading] = useState(() => readPlanSnapshot().loading);

  const syncFromCache = useCallback(() => {
    const snapshot = readPlanSnapshot();

    setTier(snapshot.tier);
    setPlan(snapshot.plan);
    setIsPaid(snapshot.isPaid);
    setMaxDomains(snapshot.maxDomains);
    setMaxPrompts(snapshot.maxPrompts);
    setEmail(snapshot.email);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await refreshPlanCache();
    } catch {
      // keep current values
    } finally {
      syncFromCache();
      setLoading(false);
    }
  }, [syncFromCache]);

  useEffect(() => {
    const handleInvalidation = () => {
      const snapshot = readPlanSnapshot();
      syncFromCache();
      setLoading(snapshot.loading);
      void refresh();
    };

    void refresh();

    if (typeof window === 'undefined') return;

    window.addEventListener(PLAN_CACHE_INVALIDATED_EVENT, handleInvalidation);
    return () => {
      window.removeEventListener(PLAN_CACHE_INVALIDATED_EVENT, handleInvalidation);
    };
  }, [refresh, syncFromCache]);

  return { tier, plan, isPaid, maxDomains, maxPrompts, email, loading, refresh };
}

/** Invalidate the plan cache (e.g., after a successful upgrade) */
export function invalidatePlanCache() {
  clearPlanCache();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PLAN_CACHE_INVALIDATED_EVENT));
  }
}
