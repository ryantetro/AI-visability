'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ActionCoach, type ActionCoachData } from '@/app/optimize/components/action-coach';
import { ScoreHero } from '@/app/optimize/components/score-hero';
import { DashboardPanel } from '@/components/app/dashboard-primitives';

export function OverviewTab({ domain }: { domain: string }) {
  const [data, setData] = useState<ActionCoachData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const res = await fetch(`/api/optimize/actions?domain=${encodeURIComponent(domain)}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed');
        const result = await res.json() as ActionCoachData;
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [domain]);

  const handleDataChange = useCallback((newData: ActionCoachData | null) => {
    setData(newData);
  }, []);

  if (loading) {
    return (
      <DashboardPanel className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </DashboardPanel>
    );
  }

  const completed = data?.actions.filter((a) => a.status === 'completed').length ?? 0;
  const total = data?.actions.length ?? 0;
  const pending = data?.actions.filter((a) => a.status !== 'completed' && a.status !== 'dismissed').length ?? 0;

  return (
    <div className="space-y-5">
      <ScoreHero
        domain={domain}
        actionsCompleted={completed}
        actionsTotal={total}
        pointsAvailable={pending}
      />
      <ActionCoach
        domain={domain}
        initialData={data}
        onDataChange={handleDataChange}
      />
    </div>
  );
}
