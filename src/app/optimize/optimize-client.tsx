'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckSquare, FileText, Globe2, Shield, Sparkles } from 'lucide-react';
import { BrandPanel } from '@/app/optimize/components/brand-panel';
import { ActionsPanel } from '@/app/optimize/components/actions-panel';
import { ContentOpportunitiesPanel } from '@/app/optimize/components/content-opportunities-panel';
import { OverviewTab } from '@/app/optimize/components/overview-tab';
import { SourcesPanel } from '@/app/optimize/components/sources-panel';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { usePlan } from '@/hooks/use-plan';
import { FEATURE_GATES, canAccess } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import type { OptimizeTabKey } from '@/lib/optimize/types';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Sparkles },
  { key: 'content', label: 'Content Studio', icon: FileText },
  { key: 'sources', label: 'Sources', icon: Globe2 },
  { key: 'actions', label: 'Actions', icon: CheckSquare },
  { key: 'brand', label: 'Brand Check', icon: Shield },
] as const;

function resolveActiveTab(value: string | null): OptimizeTabKey {
  return TABS.some((tab) => tab.key === value) ? (value as OptimizeTabKey) : 'overview';
}

export function OptimizeClient({ domain }: { domain: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tier } = usePlan();

  const activeTab = resolveActiveTab(searchParams.get('tab'));
  const brandLocked = !canAccess(tier, FEATURE_GATES.brand_positioning ?? 'pro');

  const setTab = (tab: OptimizeTabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="space-y-6">
      <DashboardPanel className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Optimize</p>
            <h1 className="mt-2 text-xl font-semibold text-white">Turn AI visibility into an action plan</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-300">{domain}</span> — your personalized AEO coach.
              Follow the actions below or explore the tabs for deeper analysis.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1 border-b border-white/[0.06] px-6 pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTab(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 border-b-2 -mb-px px-4 py-2.5 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'border-[#25c972] text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300',
                )}
              >
                <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>
      </DashboardPanel>

      {activeTab === 'overview' && <OverviewTab domain={domain} />}
      {activeTab === 'content' && <ContentOpportunitiesPanel domain={domain} />}
      {activeTab === 'sources' && <SourcesPanel domain={domain} />}
      {activeTab === 'actions' && <ActionsPanel domain={domain} />}
      {activeTab === 'brand' && <BrandPanel domain={domain} locked={brandLocked} />}
    </div>
  );
}
