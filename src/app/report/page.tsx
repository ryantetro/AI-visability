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
        <div className="mt-6 rounded-[1.35rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,13,14,0.98)_0%,rgba(8,8,9,0.99)_100%)] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a855f7]/10">
              <Code2 className="h-5 w-5 text-[#a855f7]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-white">Want to see which AI bots visit your site?</p>
              <p className="mt-0.5 text-[12px] text-zinc-500">Install the tracking script to monitor AI crawler traffic in real time.</p>
            </div>
            <Link
              href="/settings#tracking"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.08] px-4 py-2 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.12]"
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
