'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { OptimizeClient } from './optimize-client';

export default function OptimizePage() {
  return (
    <WorkspaceShell sectionKey="optimize">
      {(ctx) => (
        <OptimizeClient domain={ctx.domain} />
      )}
    </WorkspaceShell>
  );
}
