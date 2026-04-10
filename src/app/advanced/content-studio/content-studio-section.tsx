'use client';

import { useSearchParams } from 'next/navigation';
import { ContentsTab } from './contents-tab';
import { AudiencesTab } from './audiences-tab';
import type { DashboardReportData } from '@/app/advanced/lib/types';
import type { PlanTier } from '@/lib/pricing';

export function ContentStudioSection({
  domain,
}: {
  report: DashboardReportData | null;
  domain: string;
  tier: PlanTier;
  onOpenUnlock: () => void;
}) {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'contents';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Content Studio</h1>
        <p className="mt-1 text-[13px] text-zinc-400">Create AI-optimized content for your brand</p>
      </div>

      {tab === 'audiences' ? (
        <AudiencesTab key={domain} domain={domain} />
      ) : (
        <ContentsTab key={domain} domain={domain} />
      )}
    </div>
  );
}
