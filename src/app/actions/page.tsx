'use client';

import { Suspense } from 'react';
import { WorkspaceShell } from '@/components/app/workspace-shell';
import { ActionsSection } from '@/app/advanced/actions/actions-section';

function ActionsContent() {
  return (
    <WorkspaceShell sectionKey="actions">
      {(ctx) => (
        <ActionsSection
          report={ctx.report!}
          domain={ctx.domain}
          monitoringConnected={ctx.monitoringConnected}
          trackingReady={false}
          onReaudit={ctx.handleReaudit}
          reauditing={ctx.reauditing}
          tier={ctx.tier}
          onOpenUnlock={ctx.onOpenUnlock}
        />
      )}
    </WorkspaceShell>
  );
}

export default function ActionsPage() {
  return (
    <Suspense>
      <ActionsContent />
    </Suspense>
  );
}
