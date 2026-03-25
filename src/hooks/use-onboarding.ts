'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDomainContext } from '@/contexts/domain-context';

const LS_REPORT_VIEWED = 'aiso_onboarding_report_viewed';
const LS_TRACKING_INSTALLED = 'aiso_onboarding_tracking_installed';
const LS_DISMISSED = 'aiso_onboarding_dismissed';

export interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
  href: string;
}

export function useOnboarding() {
  const {
    monitoredSites,
    selectedDomain,
    expandedSite,
    report,
    monitoringConnected,
  } = useDomainContext();

  const [reportViewed, setReportViewed] = useState(false);
  const [trackingInstalled, setTrackingInstalled] = useState(false);
  const [trackingKeyOnServer, setTrackingKeyOnServer] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Read localStorage on mount
  useEffect(() => {
    setReportViewed(localStorage.getItem(LS_REPORT_VIEWED) === '1');
    setTrackingInstalled(localStorage.getItem(LS_TRACKING_INSTALLED) === '1');
    setDismissed(localStorage.getItem(LS_DISMISSED) === '1');
  }, []);

  useEffect(() => {
    if (!selectedDomain) {
      setTrackingKeyOnServer(false);
      return;
    }
    let cancelled = false;
    const q = new URLSearchParams({ domain: selectedDomain });
    fetch(`/api/user/tracking-key?${q.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { siteKey?: string | null } | null) => {
        if (cancelled || !data) return;
        const hasKey = Boolean(data.siteKey);
        setTrackingKeyOnServer(hasKey);
        if (hasKey) {
          localStorage.setItem(LS_TRACKING_INSTALLED, '1');
          setTrackingInstalled(true);
        }
      })
      .catch(() => {
        if (!cancelled) setTrackingKeyOnServer(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDomain]);

  const markReportViewed = useCallback(() => {
    localStorage.setItem(LS_REPORT_VIEWED, '1');
    setReportViewed(true);
  }, []);

  const markTrackingInstalled = useCallback(() => {
    localStorage.setItem(LS_TRACKING_INSTALLED, '1');
    setTrackingInstalled(true);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(LS_DISMISSED, '1');
    setDismissed(true);
  }, []);

  const isMonitoring = selectedDomain ? Boolean(monitoringConnected[selectedDomain]) : false;

  const steps: OnboardingStep[] = useMemo(() => [
    {
      key: 'add_domain',
      label: 'Add your first domain',
      completed: monitoredSites.length > 0,
      href: '/dashboard',
    },
    {
      key: 'run_scan',
      label: 'Run your first scan (30 sec)',
      completed: expandedSite?.latestScan?.status === 'complete',
      href: '/dashboard',
    },
    {
      key: 'review_report',
      label: 'See your AI visibility score',
      completed: reportViewed || !!report,
      href: '/report',
    },
    {
      key: 'install_tracking',
      label: 'Monitor AI bot traffic (optional)',
      completed: trackingInstalled || trackingKeyOnServer,
      href: '/dashboard#tracking',
    },
    {
      key: 'enable_monitoring',
      label: 'Get weekly score updates',
      completed: isMonitoring,
      href: '/dashboard#monitoring',
    },
  ], [
    monitoredSites.length,
    expandedSite?.latestScan?.status,
    reportViewed,
    report,
    trackingInstalled,
    trackingKeyOnServer,
    isMonitoring,
  ]);

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const nextStep = steps.find((s) => !s.completed) ?? null;
  const allComplete = completedCount === totalSteps;

  return {
    steps,
    completedCount,
    totalSteps,
    progressPct,
    nextStep,
    allComplete,
    dismissed,
    dismiss,
    markReportViewed,
    markTrackingInstalled,
  };
}
