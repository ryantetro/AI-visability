'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { AnalyticsSection } from '@/app/advanced/analytics/analytics-section';

export default function AnalyticsPage() {
  return (
    <WorkspaceShell sectionKey="analytics">
      {(ctx) => (
        <AnalyticsSection
          report={ctx.report}
          recentScans={ctx.recentScans}
          domain={ctx.domain}
          lastScannedAt={ctx.expandedSite.lastTouchedAt}
          monitoringConnected={ctx.monitoringConnected}
          monitoringLoading={ctx.monitoringLoading}
          onEnableMonitoring={ctx.handleEnableMonitoring}
        />
      )}
    </WorkspaceShell>
  );
}
