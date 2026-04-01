'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  HelpCircle,
  Loader2,
  RefreshCw,
  SkipForward,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DashboardPanel } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import type { OptimizationActionRecord } from '@/lib/optimize/types';

/* ---------- constants ---------- */

const CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  technical: { text: 'text-blue-400', bg: 'bg-blue-400/10' },
  content_distribution: { text: 'text-amber-400', bg: 'bg-amber-400/10' },
  review_platform: { text: 'text-purple-400', bg: 'bg-purple-400/10' },
  community: { text: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  pr_media: { text: 'text-pink-400', bg: 'bg-pink-400/10' },
  directory: { text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical',
  content_distribution: 'Content',
  review_platform: 'Authority',
  community: 'Community',
  pr_media: 'PR & Media',
  directory: 'Directory',
};

const EFFORT_MAP: Record<string, { label: string; minutes: string }> = {
  high: { label: 'Easy', minutes: '~10 min' },
  medium: { label: 'Medium', minutes: '~20 min' },
  low: { label: 'Involved', minutes: '~30+ min' },
};

/* ---------- types ---------- */

type ActionPayload = {
  actions: OptimizationActionRecord[];
  progress: { completed: number; total: number; pct: number };
  limited: boolean;
  readOnly: boolean;
  fromPreview: boolean;
};

/* ---------- helpers ---------- */

function getActionSteps(action: OptimizationActionRecord): string[] {
  // Generate contextual steps based on the action description
  const desc = action.description.toLowerCase();
  if (desc.includes('schema') || desc.includes('structured data')) {
    return [
      'Copy the structured data snippet below',
      'Add it to the <head> section of the relevant page',
      'Deploy your changes and run a re-scan to verify',
    ];
  }
  if (desc.includes('review') || desc.includes('g2') || desc.includes('capterra')) {
    return [
      'Create or claim your profile on the platform',
      'Fill out all profile sections completely',
      'Ask 3-5 customers to leave genuine reviews',
    ];
  }
  if (desc.includes('content') || desc.includes('blog') || desc.includes('article')) {
    return [
      'Research the topic using your prompt monitoring data',
      'Write or generate the content piece',
      'Publish and submit to AI crawlers',
    ];
  }
  if (desc.includes('sitemap') || desc.includes('robots')) {
    return [
      'Check your current configuration',
      'Update the file with the recommended changes',
      'Deploy and verify with a crawl test',
    ];
  }
  return [
    'Review the recommendation details',
    'Implement the suggested change',
    'Verify the improvement with a re-scan',
  ];
}

function getWhyItMatters(action: OptimizationActionRecord): string {
  const cat = action.category;
  if (cat === 'technical') {
    return 'Technical optimizations help AI crawlers discover and understand your content more effectively, making it more likely to be cited in AI-generated answers.';
  }
  if (cat === 'review_platform') {
    return 'AI engines heavily cite review platforms when recommending products. Having a strong presence on review sites directly increases your citation rate.';
  }
  if (cat === 'content_distribution') {
    return 'Creating targeted content for topics where AI engines can\'t find good answers from your site fills visibility gaps and captures new AI referral traffic.';
  }
  if (cat === 'community') {
    return 'Community presence signals authority to AI engines. Active participation in relevant communities builds the backlink profile AI uses for source ranking.';
  }
  if (cat === 'directory') {
    return 'Directory listings ensure AI engines have consistent, accurate information about your brand across their training data sources.';
  }
  return 'This improvement strengthens your overall AI visibility by addressing a gap that AI engines use when selecting sources for their answers.';
}

/* ---------- sub-components ---------- */

function ActionCardExpanded({
  action,
  onComplete,
  onSkip,
  busy,
}: {
  action: OptimizationActionRecord;
  onComplete: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const steps = getActionSteps(action);
  const why = getWhyItMatters(action);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    void navigator.clipboard.writeText(text);
    setCopiedStep(idx);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Why it matters */}
      <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
        <p className="text-[12px] font-semibold text-amber-400 mb-1.5">Why this matters</p>
        <p className="text-[13px] leading-relaxed text-zinc-300">{why}</p>
      </div>

      {/* Steps */}
      <div>
        <p className="text-[13px] font-semibold text-white mb-3">Steps</p>
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[12px] font-semibold text-indigo-400">
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="text-[13px] text-zinc-300">{step}</p>
                {idx === 0 && action.description && (
                  <div className="mt-2 relative group">
                    <div className="rounded-lg border border-white/8 bg-black/40 p-3 font-mono text-[12px] text-zinc-400 pr-16">
                      {action.description}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(action.description, idx)}
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedStep === idx ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 border-t border-white/8 pt-4">
        <button
          type="button"
          onClick={onComplete}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark Complete
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SkipForward className="h-4 w-4" />
          Skip for Now
        </button>
        <a
          href="mailto:support@aiso.com?subject=Help with AEO action"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/5"
        >
          <HelpCircle className="h-4 w-4" />
          Need Help
        </a>
      </div>
    </div>
  );
}

function ActionRow({
  action,
  rank,
  isExpanded,
  onToggle,
  onComplete,
  onSkip,
  busy,
}: {
  action: OptimizationActionRecord;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const catColor = CATEGORY_COLORS[action.category] ?? { text: 'text-zinc-400', bg: 'bg-zinc-400/10' };
  const catLabel = CATEGORY_LABELS[action.category] ?? action.category;
  const effort = EFFORT_MAP[action.estimatedImpact] ?? { label: 'Medium', minutes: '~20 min' };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isExpanded
          ? 'border-indigo-500/30 bg-indigo-500/[0.03]'
          : 'border-white/8 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[12px] font-semibold text-zinc-400 tabular-nums">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-white truncate">{action.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', catColor.text, catColor.bg)}>
              {catLabel}
            </span>
            <span className="text-[11px] text-zinc-500">·</span>
            <span className="text-[11px] text-zinc-500">{effort.label}</span>
            <span className="text-[11px] text-zinc-500">·</span>
            <span className="text-[11px] text-zinc-500">{effort.minutes}</span>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[12px] font-semibold text-emerald-400">
          {action.priority} impact
        </span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-white/8 p-4">
          <ActionCardExpanded
            action={action}
            onComplete={onComplete}
            onSkip={onSkip}
            busy={busy}
          />
        </div>
      )}
    </div>
  );
}

/* ---------- completed section ---------- */

function CompletedSection({ actions }: { actions: OptimizationActionRecord[] }) {
  const [open, setOpen] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-[13px] text-zinc-400">
            {actions.length} action{actions.length !== 1 ? 's' : ''} completed
          </span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-zinc-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-white/8 px-4 py-3 space-y-2">
          {actions.map((action) => (
            <div key={action.id ?? action.title} className="flex items-center gap-3 py-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400/60" />
              <span className="text-[13px] text-zinc-500 line-through">{action.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- main component ---------- */

export interface ActionCoachData {
  actions: OptimizationActionRecord[];
  progress: { completed: number; total: number; pct: number };
  limited: boolean;
  readOnly: boolean;
}

export function ActionCoach({
  domain,
  initialData,
  onDataChange,
}: {
  domain: string;
  initialData?: ActionCoachData | null;
  onDataChange?: (data: ActionCoachData | null) => void;
}) {
  const [data, setData] = useState<ActionCoachData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/optimize/actions?domain=${encodeURIComponent(domain)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed');
      return (await res.json()) as ActionCoachData;
    } catch {
      return null;
    }
  }, [domain]);

  const setDataAndNotify = useCallback((newData: ActionCoachData | null) => {
    setData(newData);
    onDataChange?.(newData);
  }, [onDataChange]);

  useEffect(() => {
    if (initialData) return; // Skip fetch when parent already loaded data
    let cancelled = false;
    setLoading(true);
    void load().then((result) => {
      if (!cancelled) {
        setDataAndNotify(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [load, initialData, setDataAndNotify]);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/optimize/actions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) throw new Error('Failed');
      const newData = await res.json() as ActionCoachData;
      setDataAndNotify(newData);
    } catch { /* keep current */ } finally {
      setRefreshing(false);
    }
  }

  async function updateStatus(action: OptimizationActionRecord, status: 'completed' | 'dismissed') {
    if (!action.id) return;
    setUpdatingId(action.id);
    try {
      const res = await fetch(`/api/optimize/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');

      const updated = await load();
      if (updated) setDataAndNotify(updated);

      if (status === 'completed') {
        setToast('Action completed! Nice work.');
        setTimeout(() => setToast(null), 3000);
      }

      setExpandedId(null);
    } catch { /* keep current */ } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <DashboardPanel className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </DashboardPanel>
    );
  }

  if (!data || data.actions.length === 0) {
    return (
      <DashboardPanel className="p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
            <Sparkles className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-white">No actions yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-zinc-500">
              Run a scan and set up prompt monitoring first. We&apos;ll generate your personalized action plan from the results.
            </p>
          </div>
          {!data?.readOnly && (
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-60"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Generate Actions
            </button>
          )}
        </div>
      </DashboardPanel>
    );
  }

  const pendingActions = data.actions.filter((a) => a.status !== 'completed' && a.status !== 'dismissed');
  const completedActions = data.actions.filter((a) => a.status === 'completed');
  const heroAction = pendingActions[0] ?? null;
  const upNextActions = pendingActions.slice(1, 6);
  const remainingCount = Math.max(0, pendingActions.length - 6);

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-4 w-4" />
            {toast}
          </div>
        </div>
      )}

      {/* Hero action */}
      {heroAction && (
        <DashboardPanel className="overflow-hidden border-amber-500/20">
          <div className="border-b border-white/8 px-6 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400">
                    Next Best Action
                  </p>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">{heroAction.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-400">
                    {heroAction.priority} impact
                  </span>
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-[12px] font-medium',
                    CATEGORY_COLORS[heroAction.category]?.text ?? 'text-zinc-400',
                    CATEGORY_COLORS[heroAction.category]?.bg ?? 'bg-zinc-400/10',
                  )}>
                    {CATEGORY_LABELS[heroAction.category] ?? heroAction.category}
                  </span>
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[12px] text-zinc-400">
                    {EFFORT_MAP[heroAction.estimatedImpact]?.label ?? 'Medium'}
                  </span>
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[12px] text-zinc-400">
                    {EFFORT_MAP[heroAction.estimatedImpact]?.minutes ?? '~20 min'}
                  </span>
                </div>
              </div>
              {expandedId !== (heroAction.id ?? heroAction.title) ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(heroAction.id ?? heroAction.title)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400"
                  >
                    Start This
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateStatus(heroAction, 'dismissed')}
                    disabled={updatingId === heroAction.id || !heroAction.id}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/5 disabled:opacity-60"
                  >
                    Skip
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {expandedId === (heroAction.id ?? heroAction.title) && (
            <div className="px-6 py-5">
              <ActionCardExpanded
                action={heroAction}
                onComplete={() => void updateStatus(heroAction, 'completed')}
                onSkip={() => void updateStatus(heroAction, 'dismissed')}
                busy={updatingId === heroAction.id}
              />
            </div>
          )}
        </DashboardPanel>
      )}

      {/* Up next queue */}
      {upNextActions.length > 0 && (
        <DashboardPanel className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Up Next</p>
            {!data.readOnly && (
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 transition-colors hover:text-zinc-300"
              >
                <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
                Refresh
              </button>
            )}
          </div>
          <div className="space-y-2">
            {upNextActions.map((action, idx) => (
              <ActionRow
                key={action.id ?? action.title}
                action={action}
                rank={idx + 2}
                isExpanded={expandedId === (action.id ?? action.title)}
                onToggle={() =>
                  setExpandedId(
                    expandedId === (action.id ?? action.title) ? null : (action.id ?? action.title),
                  )
                }
                onComplete={() => void updateStatus(action, 'completed')}
                onSkip={() => void updateStatus(action, 'dismissed')}
                busy={updatingId === action.id}
              />
            ))}
          </div>
          {remainingCount > 0 && (
            <p className="mt-3 text-center text-[12px] text-zinc-500">
              {remainingCount} more action{remainingCount !== 1 ? 's' : ''} available
            </p>
          )}
        </DashboardPanel>
      )}

      {/* Completed */}
      <CompletedSection actions={completedActions} />
    </div>
  );
}
