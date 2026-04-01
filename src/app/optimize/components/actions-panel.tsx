'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { OptimizeTabGuide } from '@/app/optimize/components/optimize-tab-guide';
import { cn } from '@/lib/utils';
import type { OptimizationActionRecord } from '@/lib/optimize/types';

type Payload = {
  actions: OptimizationActionRecord[];
  progress: {
    completed: number;
    total: number;
    pct: number;
  };
  limited: boolean;
  readOnly: boolean;
  fromPreview: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  review_platform: 'Review Platforms',
  community: 'Community Presence',
  pr_media: 'PR & Media',
  directory: 'Directory Accuracy',
  technical: 'Technical AEO',
  content_distribution: 'Content Distribution',
};

function priorityClass(priority: OptimizationActionRecord['priority']) {
  if (priority === 'high') return 'border-red-400/20 bg-red-400/10 text-red-200';
  if (priority === 'medium') return 'border-amber-300/20 bg-amber-400/10 text-amber-200';
  return 'border-white/10 bg-white/[0.04] text-zinc-300';
}

async function fetchActions(domain: string): Promise<Payload> {
  const response = await fetch(`/api/optimize/actions?domain=${encodeURIComponent(domain)}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load actions');
  }

  return response.json() as Promise<Payload>;
}

export function ActionsPanel({ domain }: { domain: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setData(await fetchActions(domain));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      try {
        const payload = await fetchActions(domain);
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch('/api/optimize/actions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh');
      }

      const payload = await response.json();
      setData(payload as Payload);
    } catch {
      // Fall back to current state.
    } finally {
      setRefreshing(false);
    }
  }

  async function updateStatus(action: OptimizationActionRecord, status: 'pending' | 'completed' | 'dismissed') {
    if (!action.id) return;

    setUpdatingId(action.id);
    try {
      const response = await fetch(`/api/optimize/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      await load();
    } catch {
      // Leave the current view alone on failure.
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[1.4rem] border border-white/8 bg-white/[0.03]">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[1.4rem] border border-red-500/20 bg-red-500/8 p-6 text-sm text-red-200">
        Unable to load optimization actions right now.
      </div>
    );
  }

  const grouped = Object.entries(
    data.actions.reduce<Record<string, OptimizationActionRecord[]>>((accumulator, action) => {
      const key = action.status === 'completed' ? 'completed' : action.category;
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(action);
      return accumulator;
    }, {}),
  );

  return (
    <section className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Off-Page Action Plan
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Your working checklist</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-500">
            Off-site and fix-it tasks rolled into one list—your weekly AEO to-dos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.limited && (
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] text-zinc-400">
              Free preview: top 3 only
            </span>
          )}
          {!data.readOnly && (
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh actions
            </button>
          )}
        </div>
      </div>

      <OptimizeTabGuide
        className="mt-5"
        summary="How to use this tab"
        steps={[
          'Start with high priority rows.',
          'Refresh after a new scan or prompt run when the button is available.',
          'Mark complete when done, dismiss what does not apply.',
        ]}
      />

      <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white">
            {data.progress.completed} of {data.progress.total} actions completed
          </p>
          <p className="text-sm text-zinc-400">{data.progress.pct}% done</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#25c972] to-[#8de4b2]"
            style={{ width: `${data.progress.pct}%` }}
          />
        </div>
        {data.fromPreview && (
          <p className="mt-3 text-sm text-zinc-400">
            This list is being rendered from live signals before anything has been persisted to the action table.
          </p>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {grouped.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-zinc-400">
            No actions are queued yet. Refresh the plan after you have prompt monitoring results or a fresh scan for this domain.
          </div>
        ) : grouped.map(([group, actions]) => (
          <div key={group} className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-white">
              {group === 'completed' ? 'Completed' : (CATEGORY_LABELS[group] ?? group)}
            </h3>
            <div className="mt-3 space-y-3">
              {actions.map((action) => {
                const busy = updatingId === action.id;
                return (
                  <article
                    key={`${action.id ?? action.title}:${action.status}`}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('rounded-full border px-2 py-1 text-[11px] font-medium', priorityClass(action.priority))}>
                            {action.priority} priority
                          </span>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-zinc-400">
                            {action.source.replace('_', ' ')}
                          </span>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-zinc-400">
                            {action.estimatedImpact} impact
                          </span>
                        </div>

                        <h4 className="mt-3 text-base font-semibold text-white">{action.title}</h4>
                        <p className="mt-2 text-sm text-zinc-400">{action.description}</p>
                      </div>

                      {!data.readOnly && action.id && (
                        <div className="flex flex-wrap items-center gap-2">
                          {action.status !== 'completed' ? (
                            <button
                              type="button"
                              onClick={() => void updateStatus(action, 'completed')}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#25c972]/20 bg-[#25c972]/10 px-3 py-1.5 text-[12px] font-medium text-[#9af1be] transition-colors hover:bg-[#25c972]/16 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Mark complete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void updateStatus(action, 'pending')}
                              disabled={busy}
                              className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Reopen
                            </button>
                          )}
                          {action.status !== 'dismissed' && action.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => void updateStatus(action, 'dismissed')}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Dismiss
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
