'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { ContentStudioSection } from '@/app/advanced/content-studio/content-studio-section';

export default function ContentStudioPage() {
  return (
    <WorkspaceShell sectionKey="content-studio" wide>
      {(ctx) => (
        <ContentStudioSection
          report={ctx.report}
          domain={ctx.domain}
          tier={ctx.tier}
          onOpenUnlock={ctx.onOpenUnlock}
        />
      )}
    </WorkspaceShell>
  );
}
