'use client';

import { useMemo, useState } from 'react';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import type { PrioritizedFix } from '@/types/score';
import type { GeneratedFile } from '../lib/types';
import type { WorkstreamMeta } from '../lib/types';
import { FixCard } from '../panels/fix-card';

type FilterKey = 'all' | string;

interface ImproveFixListProps {
  groupedFixes: Array<WorkstreamMeta & { fixes: PrioritizedFix[] }>;
  files: GeneratedFile[] | null;
  matchFixToFile: (fix: PrioritizedFix, files: GeneratedFile[]) => GeneratedFile | null;
  copiedSinglePrompt: string | null;
  onCopyPrompt: (fix: PrioritizedFix, relatedFile: GeneratedFile | null) => Promise<void>;
}

function sortByRoi(fixes: PrioritizedFix[]) {
  return [...fixes].sort((a, b) => b.roi - a.roi);
}

export function ImproveFixList({
  groupedFixes,
  files,
  matchFixToFile,
  copiedSinglePrompt,
  onCopyPrompt,
}: ImproveFixListProps) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const tabs = useMemo(() => {
    const allSorted = sortByRoi(groupedFixes.flatMap((g) => g.fixes));
    const items: { key: FilterKey; label: string; count: number }[] = [
      { key: 'all', label: 'All', count: allSorted.length },
    ];
    for (const g of groupedFixes) {
      items.push({ key: g.key, label: g.title, count: g.fixes.length });
    }
    return items;
  }, [groupedFixes]);

  const visibleFixes = useMemo(() => {
    if (filter === 'all') {
      return sortByRoi(groupedFixes.flatMap((g) => g.fixes));
    }
    const group = groupedFixes.find((g) => g.key === filter);
    return group ? sortByRoi(group.fixes) : [];
  }, [filter, groupedFixes]);

  const groupTitleByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groupedFixes) m.set(g.key, g.title);
    return m;
  }, [groupedFixes]);

  if (groupedFixes.length === 0) {
    return (
      <DashboardPanel id="improve-fix-list" className="p-5">
        <p className="text-center text-sm text-zinc-500">No fixes needed. Your site is in great shape!</p>
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel id="improve-fix-list" className="p-5">
      <SectionTitle
        eyebrow="Implementation"
        title="All fixes"
        description="Filter by workstream. Expand a row for instructions and copy-ready prompts."
      />

      <div className="mt-4 flex flex-wrap gap-1 border-b border-white/8 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              'rounded-t-lg px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-px',
              filter === tab.key
                ? 'border-[#25c972] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300',
            )}
          >
            {tab.label}
            <span className="ml-1 text-[9px] text-zinc-600 tabular-nums">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {visibleFixes.map((fix, index) => {
          const relatedFile = files ? matchFixToFile(fix, files) : null;
          const wsKey =
            groupedFixes.find((g) => g.fixes.some((f) => f.checkId === fix.checkId))?.key ?? '';
          const workstreamTitle = groupTitleByKey.get(wsKey);
          const prevWsKey =
            index > 0
              ? groupedFixes.find((g) =>
                  g.fixes.some((f) => f.checkId === visibleFixes[index - 1]!.checkId),
                )?.key ?? ''
              : null;
          const showWorkstreamHeading = filter === 'all' && workstreamTitle && wsKey !== prevWsKey;

          return (
            <div key={fix.checkId} className="space-y-1">
              {showWorkstreamHeading && (
                <p
                  className={cn(
                    'pl-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600',
                    index > 0 && 'pt-3',
                  )}
                >
                  {workstreamTitle}
                </p>
              )}
              <FixCard
                copied={copiedSinglePrompt === (relatedFile?.filename ?? fix.checkId)}
                file={relatedFile}
                fix={fix}
                index={index + 1}
                onCopyPrompt={() => onCopyPrompt(fix, relatedFile)}
              />
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}
