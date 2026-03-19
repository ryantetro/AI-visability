'use client';

import { useCallback, useEffect, useState } from 'react';
import { type PlanTier, planStringToTier } from '@/lib/pricing';

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

let cachedTier: PlanTier | null = null;
let cachedPlan: string | null = null;
let cachedIsPaid: boolean | null = null;
let cachedMaxDomains: number | null = null;
let cachedMaxPrompts: number | null = null;
let cachedEmail: string | null = null;

export function usePlan(): PlanState {
  const [tier, setTier] = useState<PlanTier>(cachedTier ?? 'free');
  const [plan, setPlan] = useState<string>(cachedPlan ?? 'free');
  const [isPaid, setIsPaid] = useState<boolean>(cachedIsPaid ?? false);
  const [maxDomains, setMaxDomains] = useState<number>(cachedMaxDomains ?? 1);
  const [maxPrompts, setMaxPrompts] = useState<number>(cachedMaxPrompts ?? 5);
  const [email, setEmail] = useState<string>(cachedEmail ?? '');
  const [loading, setLoading] = useState(cachedTier === null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const userPlan = data.plan ?? data.user?.plan ?? 'free';
      const resolved = planStringToTier(userPlan);

      cachedTier = resolved;
      cachedPlan = userPlan;
      const resolvedIsPaid: boolean = data.isPaid ?? resolved !== 'free';
      const resolvedMaxDomains: number = data.maxDomains ?? 1;
      const resolvedMaxPrompts: number = data.maxPrompts ?? 5;

      const resolvedEmail: string = data.user?.email ?? '';

      cachedIsPaid = resolvedIsPaid;
      cachedMaxDomains = resolvedMaxDomains;
      cachedMaxPrompts = resolvedMaxPrompts;
      cachedEmail = resolvedEmail;

      setTier(resolved);
      setPlan(userPlan);
      setIsPaid(resolvedIsPaid);
      setMaxDomains(resolvedMaxDomains);
      setMaxPrompts(resolvedMaxPrompts);
      setEmail(resolvedEmail);
    } catch {
      // keep current values
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cachedTier === null) {
      void refresh();
    }
  }, [refresh]);

  return { tier, plan, isPaid, maxDomains, maxPrompts, email, loading, refresh };
}

/** Invalidate the plan cache (e.g., after a successful upgrade) */
export function invalidatePlanCache() {
  cachedTier = null;
  cachedPlan = null;
  cachedIsPaid = null;
  cachedMaxDomains = null;
  cachedMaxPrompts = null;
  cachedEmail = null;
}
