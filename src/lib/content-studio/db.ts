/**
 * Sequential persistence chain for Content Studio items.
 *
 * Follows the `persistChain` pattern from `src/lib/scan-workflow.ts` —
 * each call to `updateItem()` queues sequentially so we never have
 * concurrent writes to the same row.
 */

import { getSupabaseClient } from '@/lib/supabase';
import type { ContentItem, PhaseKey, PhaseStatus, WorkflowProgress } from './types';

export interface ContentPersistChain {
  /**
   * Queue a mutation on the content item.
   * Reads the latest row, applies `mutate`, writes back.
   */
  updateItem(
    mutate: (item: ContentItem) => void | Promise<void>,
  ): Promise<ContentItem | null>;
}

export function createContentPersistChain(itemId: string): ContentPersistChain {
  let chain = Promise.resolve<ContentItem | null>(null);

  const updateItem = async (
    mutate: (item: ContentItem) => void | Promise<void>,
  ): Promise<ContentItem | null> => {
    chain = chain.then(async () => {
      const supabase = getSupabaseClient();
      const { data: latest, error } = await supabase
        .from('content_studio_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error || !latest) return null;

      await mutate(latest as ContentItem);

      const { data: updated, error: updateError } = await supabase
        .from('content_studio_items')
        .update({
          status: latest.status,
          brief_markdown: latest.brief_markdown,
          article_markdown: latest.article_markdown,
          workflow_progress: latest.workflow_progress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select('*')
        .single();

      if (updateError) {
        console.error('[content-studio:db] update failed', updateError.message);
        return latest as ContentItem;
      }

      return updated as ContentItem;
    });

    return chain;
  };

  return { updateItem };
}

/* ── Convenience helpers ─────────────────────────────────────────── */

/** Phase → (step index, progress %, currentTask label) */
const PHASE_META: Record<PhaseKey, { step: number; progress: number; label: string }> = {
  web_research:      { step: 1, progress: 20,  label: 'Researching your topic' },
  quote_extraction:  { step: 2, progress: 40,  label: 'Extracting key quotes and data' },
  outline:           { step: 3, progress: 60,  label: 'Building content outline' },
  brief:             { step: 4, progress: 80,  label: 'Generating content brief' },
  article:           { step: 5, progress: 100, label: 'Writing article' },
};

/**
 * Update the phase status inside `workflow_progress` and keep the
 * top-level `step` / `progress` / `currentTask` in sync for the
 * existing frontend.
 */
export function setPhaseStatus(
  item: ContentItem,
  phase: PhaseKey,
  status: PhaseStatus,
  error?: string,
): void {
  const wp = (item.workflow_progress ?? {
    step: 0,
    progress: 0,
    currentTask: '',
    phases: {},
  }) as WorkflowProgress;

  if (!wp.phases) {
    wp.phases = {
      web_research: { status: 'pending' },
      quote_extraction: { status: 'pending' },
      outline: { status: 'pending' },
      brief: { status: 'pending' },
      article: { status: 'pending' },
    };
  }

  wp.phases[phase] = { status, ...(error ? { error } : {}) };

  const meta = PHASE_META[phase];
  if (status === 'running') {
    wp.step = meta.step;
    wp.currentTask = meta.label;
    // Running phase: progress is previous phase's value
    const prevProgress = meta.step > 1 ? PHASE_META[getPreviousPhase(phase)!].progress : 0;
    wp.progress = prevProgress;
  } else if (status === 'complete') {
    wp.step = meta.step;
    wp.progress = meta.progress;
    wp.currentTask = meta.label;
  } else if (status === 'error') {
    wp.currentTask = `Error: ${error ?? 'Unknown error'}`;
  }

  item.workflow_progress = wp;
}

function getPreviousPhase(phase: PhaseKey): PhaseKey | null {
  const order: PhaseKey[] = ['web_research', 'quote_extraction', 'outline', 'brief', 'article'];
  const idx = order.indexOf(phase);
  return idx > 0 ? order[idx - 1] : null;
}
