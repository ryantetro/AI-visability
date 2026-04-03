'use client';

import { BrandSection } from '@/app/advanced/brand/brand-section';
import { WorkspaceShell } from '@/components/app/workspace-shell';
import type { BrandSectionKey } from '@/lib/brand-navigation';

export function BrandWorkspaceSectionClient({ section }: { section: BrandSectionKey }) {
  return (
    <WorkspaceShell sectionKey="brand">
      {(ctx) => (
        <BrandSection
          report={ctx.report}
          files={ctx.files}
          domain={ctx.domain}
          platformLabel={ctx.platformLabel}
          activeSection={section}
        />
      )}
    </WorkspaceShell>
  );
}
