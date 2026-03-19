'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { CompetitorsDashboard } from './competitors-dashboard';

export default function CompetitorsPage() {
  return (
    <WorkspaceShell sectionKey="competitors">
      {(ctx) => (
        <CompetitorsDashboard domain={ctx.domain} />
      )}
    </WorkspaceShell>
  );
}
