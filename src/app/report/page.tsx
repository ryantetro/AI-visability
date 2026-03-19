'use client';

import { WorkspaceShell } from '@/components/app/workspace-shell';
import { ReportSection } from '@/app/advanced/report/report-section';

export default function ReportPage() {
  return (
    <WorkspaceShell sectionKey="report">
      {(ctx) => (
        <ReportSection
          report={ctx.report}
          files={ctx.files}
          domain={ctx.domain}
          onReaudit={ctx.handleReaudit}
          reauditing={ctx.reauditing}
        />
      )}
    </WorkspaceShell>
  );
}
