'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Code2, ArrowRight } from 'lucide-react';
import { WorkspaceShell } from '@/components/app/workspace-shell';
import { ReportSection } from '@/app/advanced/report/report-section';
import { useOnboarding } from '@/hooks/use-onboarding';
import type { WorkspaceContext } from '@/components/app/workspace-shell';

function ReportContent({ ctx }: { ctx: WorkspaceContext }) {
  const { markReportViewed, steps } = useOnboarding();
  const trackingInstalled = steps.find((s) => s.key === 'install_tracking')?.completed;

  useEffect(() => {
    if (ctx.report) {
      markReportViewed();
    }
  }, [ctx.report, markReportViewed]);

  return (
    <>
      <ReportSection
        report={ctx.report}
        files={ctx.files}
        domain={ctx.domain}
        onReaudit={ctx.handleReaudit}
        reauditing={ctx.reauditing}
        onOpenUnlock={ctx.onOpenUnlock}
      />
      {!trackingInstalled && (
        <div className="mt-6 rounded-[1.35rem] border border-purple-100 bg-purple-50/60 p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100">
              <Code2 className="h-4.5 w-4.5 h-[18px] w-[18px] text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-gray-900">Want to see which AI bots visit your site?</p>
              <p className="mt-0.5 text-[12px] text-gray-500">Install the tracking script to monitor AI crawler traffic in real time.</p>
            </div>
            <Link
              href="/settings#tracking"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[12px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Go to Settings
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function ReportPage() {
  return (
    <WorkspaceShell sectionKey="report">
      {(ctx) => <ReportContent ctx={ctx} />}
    </WorkspaceShell>
  );
}
