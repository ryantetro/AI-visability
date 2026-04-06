'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDomainContextSafe } from './domain-context';
import type { CountResponse } from '@/types/action-checklist';

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

  const fetchCount = useCallback(async () => {
    if (!selectedDomain) {
      setRemainingCount(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/action-checklist/count?domain=${encodeURIComponent(selectedDomain)}`,
      );
      if (res.ok) {
        const data: CountResponse = await res.json();
        setRemainingCount(data.remaining);
      }
    } catch {
      // silent — badge just won't show
    }
  }, [selectedDomain]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return (
    <ActionChecklistContext.Provider value={{ remainingCount, refreshCount: fetchCount }}>
      {children}
    </ActionChecklistContext.Provider>
  );
}

export function useActionChecklistCount() {
  return useContext(ActionChecklistContext);
}
