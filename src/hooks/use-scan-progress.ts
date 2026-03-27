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
    aiMentions?: {
      status: 'pending' | 'running' | 'complete' | 'failed' | 'unavailable';
      phase: 'queued' | 'prompt_generation' | 'engine_testing' | 'response_analysis' | 'finalizing' | null;
      startedAt?: number;
      completedAt?: number;
      error?: string;
      metrics?: {
        plannedPrompts?: number;
        executedPrompts?: number;
        responsesCollected?: number;
        enginesPlanned?: number;
        enginesCompleted?: number;
        degraded?: boolean;
      };
    };
  };
  progress: {
    status: string;
    checks: { label: string; status: string }[];
    lanes?: Array<{
      key: 'site_scan' | 'ai_mentions';
      label: string;
      status: 'pending' | 'running' | 'done' | 'error';
      progressPct?: number;
      currentStep?: string;
      checks: { label: string; status: 'pending' | 'running' | 'done' | 'error' }[];
    }>;
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
  assetPreview?: {
    faviconUrl?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImageUrl?: string | null;
    ogUrl?: string | null;
    twitterCard?: string | null;
    twitterTitle?: string | null;
    twitterDescription?: string | null;
    twitterImageUrl?: string | null;
  };
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
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch scan');
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scan');
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
    const aiMentionsRunning = data?.enrichments?.aiMentions?.status === 'running' || data?.enrichments?.aiMentions?.status === 'pending';
    const interval = setInterval(() => {
      const webHealthRunning = data?.enrichments?.webHealth?.status === 'running';
      if ((data?.status === 'complete' && !webHealthRunning && !aiMentionsRunning) || data?.status === 'failed') return;
      poll();
    }, data?.status === 'scoring' && aiMentionsRunning ? 2500 : 1500);
    return () => clearInterval(interval);
  }, [scanId, poll, data?.status, data?.enrichments?.webHealth?.status, data?.enrichments?.aiMentions?.status]);

  return { data, loading, error, refetch: poll };
}
