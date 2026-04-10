'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { PromptsSection } from '@/app/advanced/prompts/prompts-section';

export default function PromptsPage() {
  return (
    <WorkspaceShell sectionKey="prompts">
      {(ctx) => (
        <PromptsSection
          key={ctx.domain}
          report={ctx.report}
          domain={ctx.domain}
          tier={ctx.tier}
          onOpenUnlock={ctx.onOpenUnlock}
        />
      )}
    </WorkspaceShell>
  );
}
