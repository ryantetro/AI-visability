'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const DEBUG_PAID_KEY = 'aiso_debug_paid_view';

function loadDebugPaid(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEBUG_PAID_KEY) === 'true';
}

function saveDebugPaid(value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEBUG_PAID_KEY, value ? 'true' : 'false');
}

interface DebugPaidContextValue {
  debugPaidView: boolean;
  setDebugPaidView: (value: boolean) => void;
  toggleDebugPaidView: () => void;
}

const DebugPaidContext = createContext<DebugPaidContextValue | null>(null);

export function useDebugPaidView() {
  const ctx = useContext(DebugPaidContext);
  return ctx ?? { debugPaidView: false, setDebugPaidView: () => {}, toggleDebugPaidView: () => {} };
}

export function DebugPaidProvider({ children }: { children: React.ReactNode }) {
  const [debugPaidView, setState] = useState(false);

  useEffect(() => {
    setState(loadDebugPaid());
  }, []);

  const setDebugPaidView = useCallback((value: boolean) => {
    saveDebugPaid(value);
    setState(value);
  }, []);

  const toggleDebugPaidView = useCallback(() => {
    setDebugPaidView(!loadDebugPaid());
  }, [setDebugPaidView]);

  return (
    <DebugPaidContext.Provider value={{ debugPaidView, setDebugPaidView, toggleDebugPaidView }}>
      {children}
    </DebugPaidContext.Provider>
  );
}
