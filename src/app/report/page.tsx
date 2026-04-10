'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { DashboardSection } from '@/app/advanced/dashboard/dashboard-section';

export default function ReportPage() {
  return (
    <WorkspaceShell sectionKey="report">
      {(ctx) => (
        <DashboardSection
          report={ctx.report!}
          recentScans={ctx.recentScans}
          domain={ctx.domain}
          lastScannedAt={ctx.expandedSite.lastTouchedAt}
          monitoringConnected={ctx.monitoringConnected}
          monitoringLoading={ctx.monitoringLoading}
          onEnableMonitoring={ctx.handleEnableMonitoring}
          onReaudit={ctx.handleReaudit}
          reauditing={ctx.reauditing}
        />
      )}
    </WorkspaceShell>
  );
}
