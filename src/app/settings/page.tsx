'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { SettingsSection } from '@/app/advanced/settings/settings-section';

export default function SettingsPage() {
  return (
    <WorkspaceShell sectionKey="settings">
      {(ctx) => (
        <SettingsSection
          domain={ctx.domain}
          monitoringConnected={ctx.monitoringConnected}
          monitoringLoading={ctx.monitoringLoading}
          onEnableMonitoring={ctx.handleEnableMonitoring}
        />
      )}
    </WorkspaceShell>
  );
}
