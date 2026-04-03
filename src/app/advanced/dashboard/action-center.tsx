'use client';

import { FixNowColumn } from './fix-now-column';
import { KeepDoingColumn } from './keep-doing-column';
import type { PrioritizedFix } from '@/types/score';

interface ActionCenterProps {
  fixes: PrioritizedFix[];
  monitoringConnected: boolean;
  trackingReady: boolean;
  maxCompetitors: number;
  reportId?: string | null;
}

export function ActionCenter({
  fixes,
  monitoringConnected,
  trackingReady,
  maxCompetitors,
  reportId,
}: ActionCenterProps) {
  const hasStructuredDataFixes = fixes.some(
    (f) => f.dimension === 'structured-data' || f.dimension === 'entity-clarity'
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FixNowColumn fixes={fixes} reportId={reportId} />
      <KeepDoingColumn
        monitoringConnected={monitoringConnected}
        trackingReady={trackingReady}
        hasStructuredDataFixes={hasStructuredDataFixes}
        maxCompetitors={maxCompetitors}
        reportId={reportId}
      />
    </div>
  );
}
