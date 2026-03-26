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
  maxPlatforms: number;
  maxCompetitors: number;
  maxRegions: number;
  maxSeats: number;
  maxContentPages: number;
  email: string;
  teamId: string | null;
  teamRole: 'owner' | 'member' | null;
  teamName: string | null;
  planExpiresAt: string | null;
  planCancelAtPeriodEnd: boolean;
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
    maxPlatforms: snapshot.maxPlatforms ?? 2,
    maxCompetitors: snapshot.maxCompetitors ?? 0,
    maxRegions: snapshot.maxRegions ?? 1,
    maxSeats: snapshot.maxSeats ?? 1,
    maxContentPages: snapshot.maxContentPages ?? 0,
    email: snapshot.email ?? '',
    teamId: snapshot.teamId ?? null,
    teamRole: snapshot.teamRole ?? null,
    teamName: snapshot.teamName ?? null,
    planExpiresAt: snapshot.planExpiresAt ?? null,
    planCancelAtPeriodEnd: snapshot.planCancelAtPeriodEnd ?? false,
    loading: snapshot.tier === null,
  };
}

export function usePlan(): PlanState {
  const [state, setState] = useState(() => readPlanSnapshot());

  const syncFromCache = useCallback(() => {
    setState(readPlanSnapshot());
  }, []);

  const refresh = useCallback(async () => {
    try {
      await refreshPlanCache();
    } catch {
      // keep current values
    } finally {
      syncFromCache();
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [syncFromCache]);

  useEffect(() => {
    const handleInvalidation = () => {
      syncFromCache();
      void refresh();
    };

    void refresh();

    if (typeof window === 'undefined') return;

    window.addEventListener(PLAN_CACHE_INVALIDATED_EVENT, handleInvalidation);
    return () => {
      window.removeEventListener(PLAN_CACHE_INVALIDATED_EVENT, handleInvalidation);
    };
  }, [refresh, syncFromCache]);

  return { ...state, refresh };
}

/** Invalidate the plan cache (e.g., after a successful upgrade) */
export function invalidatePlanCache() {
  clearPlanCache();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PLAN_CACHE_INVALIDATED_EVENT));
  }
}
