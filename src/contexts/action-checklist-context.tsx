'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDomainContextSafe } from './domain-context';
import type { CountResponse } from '@/types/action-checklist';

const COUNT_CACHE_TTL_MS = 60_000;
const COUNT_FETCH_DEFER_MS = 700;
const countCache = new Map<string, { remaining: number; cachedAt: number }>();

interface ActionChecklistContextValue {
  remainingCount: number | null;
  refreshCount: () => void;
}

const ActionChecklistContext = createContext<ActionChecklistContextValue>({
  remainingCount: null,
  refreshCount: () => {},
});

export function ActionChecklistProvider({ children }: { children: React.ReactNode }) {
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const domainCtx = useDomainContextSafe();
  const selectedDomain = domainCtx?.selectedDomain ?? null;

  const fetchCount = useCallback(async (options?: { force?: boolean }) => {
    if (!selectedDomain) {
      setRemainingCount(null);
      return;
    }

    const cached = countCache.get(selectedDomain);
    if (!options?.force && cached && Date.now() - cached.cachedAt < COUNT_CACHE_TTL_MS) {
      setRemainingCount(cached.remaining);
      return;
    }

    try {
      const res = await fetch(
        `/api/action-checklist/count?domain=${encodeURIComponent(selectedDomain)}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const data: CountResponse = await res.json();
        countCache.set(selectedDomain, { remaining: data.remaining, cachedAt: Date.now() });
        setRemainingCount(data.remaining);
      }
    } catch {
      // silent — badge just won't show
    }
  }, [selectedDomain]);

  useEffect(() => {
    if (!selectedDomain) {
      setRemainingCount(null);
      return;
    }

    const cached = countCache.get(selectedDomain);
    if (cached && Date.now() - cached.cachedAt < COUNT_CACHE_TTL_MS) {
      setRemainingCount(cached.remaining);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchCount();
    }, COUNT_FETCH_DEFER_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchCount]);

  return (
    <ActionChecklistContext.Provider value={{ remainingCount, refreshCount: () => { void fetchCount({ force: true }); } }}>
      {children}
    </ActionChecklistContext.Provider>
  );
}

export function useActionChecklistCount() {
  return useContext(ActionChecklistContext);
}
