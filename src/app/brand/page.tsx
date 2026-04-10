'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { BrandSection } from '@/app/advanced/brand/brand-section';

export default function BrandPage() {
  return (
    <WorkspaceShell sectionKey="brand">
      {(ctx) => (
        <BrandSection
          report={ctx.report!}
          files={ctx.files}
          domain={ctx.domain}
          platformLabel={ctx.platformLabel}
        />
      )}
    </WorkspaceShell>
  );
}
