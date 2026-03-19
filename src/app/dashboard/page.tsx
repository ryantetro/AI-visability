'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { DashboardSection } from '@/app/advanced/dashboard/dashboard-section';

export default function DashboardPage() {
  return (
    <WorkspaceShell sectionKey="dashboard">
      {(ctx) => (
        <DashboardSection
          report={ctx.report}
          recentScans={ctx.recentScans}
          domain={ctx.domain}
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
