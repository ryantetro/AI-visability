'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScanData {
  id: string;
  url: string;
  status: string;
  progress: {
    status: string;
    checks: { label: string; status: string }[];
    currentStep?: string;
    error?: string;
  };
  score?: number;
  band?: string;
  bandInfo?: { band: string; label: string; color: string; min: number; max: number };
  hasEmail: boolean;
  hasPaid: boolean;
  createdAt: number;
  completedAt?: number;
  estimatedRemainingSec?: number;
}

export function useScanProgress(scanId: string | null) {
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    if (!scanId) return;
    try {
      const res = await fetch(`/api/scan/${scanId}`);
      if (!res.ok) throw new Error('Failed to fetch scan');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    if (!scanId) return;
    poll();
    const interval = setInterval(() => {
      if (data?.status === 'complete' || data?.status === 'failed') return;
      poll();
    }, 1500);
    return () => clearInterval(interval);
  }, [scanId, poll, data?.status]);

  return { data, loading, error, refetch: poll };
}
