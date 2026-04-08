'use client';

import { useEffect, useState, useCallback } from 'react';
import { Lock, PartyPopper, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type PlanTier, canAccess } from '@/lib/pricing';
import { ProgressRing } from './progress-ring';
import { ActionCard } from './action-card';
import { useActionChecklistCount } from '@/contexts/action-checklist-context';
import type {
  ActionChecklistItem,
  ActionChecklistSummary,
  ActionViewMode,
  ActionStatusFilter,
  SyncItemPayload,
  SyncResponse,
  ToggleResponse,
} from '@/types/action-checklist';
import type { DashboardReportData } from '../lib/types';

const FREE_VISIBLE_FIXES = 3;

const DIMENSION_LABELS: Record<string, string> = {
  'file-presence': 'File Presence',
  'structured-data': 'Structured Data',
  'content-signals': 'Content Signals',
  'topical-authority': 'Topical Authority',
  'entity-clarity': 'Entity Clarity',
  'ai-registration': 'AI Registration',
  performance: 'Performance',
  quality: 'Quality',
  security: 'Security',
};

const EFFORT_LABELS: Record<string, string> = {
  quick: 'Quick Wins',
  medium: 'Medium Effort',
  technical: 'Technical',
};

const KEEP_DOING_ITEMS: (Omit<SyncItemPayload, 'scanStatus'> & { minTier: PlanTier })[] = [
  {
    checkId: 'kd-articles',
    actionType: 'keep_doing',
    label: 'Get AI-optimized articles',
    detail: 'Content designed to boost your AI engine rankings',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
    minTier: 'pro',
  },
  {
    checkId: 'kd-monitoring',
    actionType: 'keep_doing',
    label: 'Monitor rankings weekly',
    detail: 'Track how AI engines rank your brand over time',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
    minTier: 'starter',
  },
  {
    checkId: 'kd-structured-data',
    actionType: 'keep_doing',
    label: 'Add structured data',
    detail: 'Help AI engines understand your business identity',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
    minTier: 'starter',
  },
  {
    checkId: 'kd-tracking',
    actionType: 'keep_doing',
    label: 'Install AI bot tracking',
    detail: 'See which AI crawlers visit your site',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
    minTier: 'starter',
  },
  {
    checkId: 'kd-competitors',
    actionType: 'keep_doing',
    label: 'Track your competitors',
    detail: 'Compare AI visibility scores side-by-side',
    dimension: null,
    category: null,
    estimatedLift: 0,
    effortBand: null,
    copyPrompt: null,
    minTier: 'pro',
  },
];

function buildSyncItems(
  report: DashboardReportData,
  monitoringConnected: boolean,
  trackingReady: boolean,
  userTier: PlanTier,
): SyncItemPayload[] {
  const items: SyncItemPayload[] = [];

  for (const fix of report.score.fixes) {
    items.push({
      checkId: fix.checkId,
      actionType: 'fix',
      scanStatus: 'fail',
      label: fix.label,
      detail: fix.detail,
      dimension: fix.dimension,
      category: fix.category,
      estimatedLift: fix.estimatedLift,
      effortBand: fix.effortBand,
      copyPrompt: fix.copyPrompt,
    });
  }

  for (const dim of report.score.dimensions ?? []) {
    for (const check of dim.checks) {
      if (check.verdict === 'pass') {
        const alreadyInFixes = report.score.fixes.some((f) => f.checkId === check.id);
        if (!alreadyInFixes) {
          items.push({
            checkId: check.id,
            actionType: 'fix',
            scanStatus: 'pass',
            label: check.label,
            detail: '',
            dimension: dim.key as SyncItemPayload['dimension'],
            category: null,
            estimatedLift: 0,
            effortBand: null,
            copyPrompt: null,
          });
        }
      }
    }
  }

  const hasStructuredDataFixes = report.score.fixes.some(
    (f) => f.dimension === 'structured-data' || f.dimension === 'entity-clarity',
  );

  for (const kd of KEEP_DOING_ITEMS) {
    let scanStatus: 'pass' | 'fail' | 'unknown' = 'unknown' as const;
    if (kd.checkId === 'kd-monitoring') scanStatus = monitoringConnected ? 'pass' : 'fail';
    else if (kd.checkId === 'kd-tracking') scanStatus = trackingReady ? 'pass' : 'fail';
    else if (kd.checkId === 'kd-structured-data') scanStatus = hasStructuredDataFixes ? 'fail' : 'pass';
    items.push({ ...kd, scanStatus });
  }

  return items;
}

function filterItems(
  items: ActionChecklistItem[],
  statusFilter: ActionStatusFilter,
): ActionChecklistItem[] {
  if (statusFilter === 'todo') return items.filter((i) => !i.isComplete || i.isRegression);
  if (statusFilter === 'done') return items.filter((i) => i.isComplete && !i.isRegression);
  return items;
}

function groupByCategory(items: ActionChecklistItem[]): Map<string, ActionChecklistItem[]> {
  const groups = new Map<string, ActionChecklistItem[]>();
  for (const item of items) {
    const key = item.dimension ?? 'setup';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

function groupByEffort(items: ActionChecklistItem[]): Map<string, ActionChecklistItem[]> {
  const groups = new Map<string, ActionChecklistItem[]>();
  for (const band of ['quick', 'medium', 'technical']) {
    groups.set(band, []);
  }
  for (const item of items) {
    const key = item.effortBand ?? 'technical';
    groups.get(key)!.push(item);
  }
  return groups;
}

interface ActionsSectionProps {
  report: DashboardReportData;
  domain: string;
  monitoringConnected: boolean;
  trackingReady: boolean;
  onReaudit?: () => void;
  reauditing?: boolean;
  tier?: PlanTier;
  onOpenUnlock?: () => void;
}

export function ActionsSection({
  report,
  domain,
  monitoringConnected,
  trackingReady,
  onReaudit,
  reauditing,
  tier = 'free',
  onOpenUnlock,
}: ActionsSectionProps) {
  const isFree = !canAccess(tier, 'starter');
  const isPro = canAccess(tier, 'pro');
  const [items, setItems] = useState<ActionChecklistItem[]>([]);
  const [summary, setSummary] = useState<ActionChecklistSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ActionViewMode>('priority');
  const [statusFilter, setStatusFilter] = useState<ActionStatusFilter>('all');
  const { refreshCount } = useActionChecklistCount();

  const syncData = useCallback(async () => {
    const syncItems = buildSyncItems(report, monitoringConnected, trackingReady, tier);
    try {
      const res = await fetch('/api/action-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', domain, items: syncItems }),
      });
      if (res.ok) {
        const data: SyncResponse = await res.json();
        setItems(data.items);
        setSummary(data.summary);
        refreshCount();
      } else {
        throw new Error(`sync failed: ${res.status}`);
      }
    } catch {
      const fallback = syncItems.map((i) => ({
        ...i,
        manualStatus: 'pending' as const,
        isComplete: i.scanStatus === 'pass',
        isRegression: false,
      }));
      setItems(fallback);
      const complete = fallback.filter((i) => i.isComplete).length;
      const potentialLift = fallback
        .filter((i) => !i.isComplete)
        .reduce((sum, i) => sum + i.estimatedLift, 0);
      setSummary({
        total: fallback.length,
        complete,
        remaining: fallback.length - complete,
        potentialLift,
      });
    } finally {
      setLoading(false);
    }
  }, [report, domain, monitoringConnected, trackingReady, tier, refreshCount]);

  useEffect(() => {
    syncData();
  }, [syncData]);

  const handleToggle = async (checkId: string, newStatus: 'done' | 'pending') => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) => {
        if (item.checkId !== checkId) return item;
        const manualStatus = newStatus;
        const isRegression = manualStatus === 'done' && item.scanStatus === 'fail';
        const isComplete =
          item.scanStatus === 'pass' ||
          (manualStatus === 'done' && item.scanStatus !== 'fail');
        return { ...item, manualStatus, isComplete, isRegression };
      }),
    );

    try {
      const res = await fetch('/api/action-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', domain, checkId, manualStatus: newStatus }),
      });
      if (res.ok) {
        const data: ToggleResponse = await res.json();
        setItems((prev) => {
          const updated = prev.map((item) =>
            item.checkId === data.checkId
              ? {
                  ...item,
                  manualStatus: data.manualStatus,
                  scanStatus: data.scanStatus,
                  isComplete: data.isComplete,
                  isRegression: data.isRegression,
                }
              : item,
          );
          const complete = updated.filter((i) => i.isComplete).length;
          setSummary((prev) =>
            prev ? { ...prev, complete, remaining: prev.total - complete } : null,
          );
          return updated;
        });
        refreshCount();
      }
    } catch {
      syncData();
    }
  };

  const filtered = filterItems(items, statusFilter);
  const sortedByPriority = [...filtered].sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
    return b.estimatedLift - a.estimatedLift;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <div className="h-20 w-20 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/[0.04]" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
        ))}
      </div>
    );
  }

  if (summary && summary.remaining === 0 && items.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PartyPopper className="h-12 w-12 text-[#25c972] mb-4" />
        <h2 className="text-[18px] font-semibold text-white">All actions complete!</h2>
        <p className="mt-1 text-[13px] text-zinc-400">
          Your site is fully optimized based on the latest scan.
        </p>
        {onReaudit && (
          <button
            type="button"
            onClick={onReaudit}
            disabled={reauditing}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.12] disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', reauditing && 'animate-spin')} />
            Re-scan to find new opportunities
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="flex items-center gap-6 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6">
          <ProgressRing complete={summary.complete} total={summary.total} />
          <div>
            <p className="text-[17px] font-semibold text-white">
              {summary.complete} of {summary.total} actions complete
            </p>
            {summary.potentialLift > 0 && (
              <p className="mt-1 text-[13px] text-zinc-400">
                Complete the remaining items to earn up to <span className="font-semibold text-[#25c972]">+{summary.potentialLift} pts</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* View mode & filter toggles — starter+ only */}
      {!isFree && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-white/8 bg-white/[0.02] p-0.5">
            {([['priority', 'By Priority'], ['category', 'By Category'], ['effort', 'By Effort']] as const).map(
              ([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors',
                    viewMode === mode ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          <div className="flex rounded-lg border border-white/8 bg-white/[0.02] p-0.5">
            {([['all', 'All'], ['todo', 'To Do'], ['done', 'Done']] as const).map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors',
                  statusFilter === filter ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Priority view (default for free, or when selected) */}
      {(isFree || viewMode === 'priority') && (() => {
        // Split items for free users: first N incomplete are visible, rest are locked
        let incompleteCount = 0;
        const visibleItems: { item: typeof sortedByPriority[0]; index?: number }[] = [];
        const lockedItems: { item: typeof sortedByPriority[0]; index?: number }[] = [];

        for (const item of sortedByPriority) {
          if (item.isComplete) {
            visibleItems.push({ item });
          } else {
            incompleteCount++;
            if (isFree && incompleteCount > FREE_VISIBLE_FIXES) {
              lockedItems.push({ item, index: incompleteCount });
            } else {
              visibleItems.push({ item, index: incompleteCount });
            }
          }
        }

        return (
          <div className="space-y-3">
            {visibleItems.map(({ item, index }) => (
              <ActionCard
                key={item.checkId}
                item={item}
                onToggle={handleToggle}
                index={index}
              />
            ))}

            {/* Locked section for free users — real cards with blur overlay + upgrade CTA */}
            {isFree && lockedItems.length > 0 && (
              <div className="relative">
                {/* Render real ActionCards but non-interactive */}
                <div className="space-y-3 select-none pointer-events-none blur-[3px]">
                  {lockedItems.map(({ item, index }) => (
                    <ActionCard
                      key={item.checkId}
                      item={item}
                      onToggle={() => {}}
                      index={index}
                    />
                  ))}
                </div>

                {/* Gradient overlay for smooth fade */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d0d0f]/60 to-[#0d0d0f]/90 rounded-2xl" />

                {/* Centered upgrade CTA */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#161618]/95 px-8 py-6 shadow-2xl shadow-black/50 backdrop-blur-sm text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#356df4]/15">
                      <Lock className="h-5 w-5 text-[#356df4]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-white">
                        {lockedItems.length} more action{lockedItems.length !== 1 ? 's' : ''} available
                      </p>
                      <p className="mt-1 text-[12px] text-zinc-400 max-w-[260px]">
                        Upgrade to unlock all fixes, copy-to-LLM prompts, and advanced filtering.
                      </p>
                    </div>
                    {onOpenUnlock && (
                      <button
                        type="button"
                        onClick={onOpenUnlock}
                        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-[#356df4] px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Unlock all actions
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Category view — paid only */}
      {!isFree && viewMode === 'category' && (
        <div className="space-y-8">
          {Array.from(groupByCategory(filtered)).map(([key, groupItems]) => (
            <div key={key}>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                {DIMENSION_LABELS[key] ?? 'Setup'}
              </p>
              <div className="space-y-3">
                {groupItems.map((item) => (
                  <ActionCard key={item.checkId} item={item} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Effort view — paid only */}
      {!isFree && viewMode === 'effort' && (
        <div className="space-y-8">
          {Array.from(groupByEffort(filtered)).map(([key, groupItems]) =>
            groupItems.length > 0 ? (
              <div key={key}>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                  {EFFORT_LABELS[key] ?? key}
                </p>
                <div className="space-y-3">
                  {groupItems.map((item) => (
                    <ActionCard key={item.checkId} item={item} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}


      {!isFree && filtered.length === 0 && (
        <p className="py-8 text-center text-[13px] text-zinc-500">
          {statusFilter === 'done'
            ? 'No completed actions yet.'
            : statusFilter === 'todo'
              ? 'All actions are complete!'
              : 'No actions to display.'}
        </p>
      )}
    </div>
  );
}

