'use client';

import { useState, useEffect, useCallback } from 'react';

interface WebHealthPillar {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number | null;
  status: string;
  checks: Array<{
    id: string;
    label: string;
    verdict: 'pass' | 'fail' | 'unknown';
    points: number;
    maxPoints: number;
    detail: string;
  }>;
}

interface WebHealthSummary {
  status: string;
  percentage: number | null;
  pillars: WebHealthPillar[];
}

interface DimensionScore {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  checks: Array<{
    id: string;
    label: string;
    verdict: 'pass' | 'fail' | 'unknown';
    points: number;
    maxPoints: number;
    detail: string;
  }>;
}

interface ScanData {
  id: string;
  url: string;
  status: string;
  scores?: {
    aiVisibility: number;
    webHealth: number | null;
    overall: number | null;
    potentialLift: number | null;
  };
  webHealth?: WebHealthSummary | null;
  dimensions?: DimensionScore[];
  enrichments?: {
    webHealth?: {
      status: 'pending' | 'running' | 'complete' | 'unavailable';
      startedAt?: number;
      completedAt?: number;
      error?: string;
    };
  };
  progress: {
    status: string;
    checks: { label: string; status: string }[];
    currentStep?: string;
    error?: string;
  };
  score?: number;
  previewFixes?: Array<{
    checkId: string;
    label: string;
    detail: string;
    category: 'ai' | 'web';
    estimatedLift: number;
  }>;
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
    if (!scanId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    poll();
    const interval = setInterval(() => {
      const webHealthRunning = data?.enrichments?.webHealth?.status === 'running';
      if ((data?.status === 'complete' && !webHealthRunning) || data?.status === 'failed') return;
      poll();
    }, 1500);
    return () => clearInterval(interval);
  }, [scanId, poll, data?.status, data?.enrichments?.webHealth?.status]);

  return { data, loading, error, refetch: poll };
}
