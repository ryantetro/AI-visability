'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { ActionsSection } from '@/app/advanced/actions/actions-section';

export default function ActionsPage() {
  return (
    <WorkspaceShell sectionKey="actions">
      {(ctx) => (
        <ActionsSection
          report={ctx.report}
          domain={ctx.domain}
          monitoringConnected={ctx.monitoringConnected}
          trackingReady={false}
          onReaudit={ctx.handleReaudit}
          reauditing={ctx.reauditing}
        />
      )}
    </WorkspaceShell>
  );
}
