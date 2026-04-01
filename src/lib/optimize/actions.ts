import { getSupabaseClient } from '@/lib/supabase';
import { getContentOpportunities } from '@/lib/optimize/content-opportunities';
import { getLatestCompletedScanForDomain, getPromptContext } from '@/lib/optimize/shared';
import { getSourceEcosystemAnalysis } from '@/lib/optimize/sources';
import type {
  OptimizationActionCategory,
  OptimizationActionDraft,
  OptimizationActionImpact,
  OptimizationActionPriority,
  OptimizationActionRecord,
  OptimizationActionSource,
  OptimizationActionStatus,
} from '@/lib/optimize/types';
import type { PrioritizedFix } from '@/types/score';

type ActionRow = {
  id: string;
  category: OptimizationActionCategory;
  title: string;
  description: string | null;
  source: OptimizationActionSource;
  priority: OptimizationActionPriority;
  status: OptimizationActionStatus;
  estimated_impact: OptimizationActionImpact | null;
  completed_at: string | null;
  created_at: string | null;
};

function actionKey(action: Pick<OptimizationActionDraft, 'source' | 'title'>) {
  return `${action.source}::${action.title.trim().toLowerCase()}`;
}

function priorityRank(priority: OptimizationActionPriority) {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function impactRank(impact: OptimizationActionImpact) {
  if (impact === 'high') return 3;
  if (impact === 'medium') return 2;
  return 1;
}

function compareActions(
  left: Pick<OptimizationActionDraft, 'priority' | 'estimatedImpact' | 'title'>,
  right: Pick<OptimizationActionDraft, 'priority' | 'estimatedImpact' | 'title'>,
) {
  return (
    priorityRank(right.priority) - priorityRank(left.priority)
    || impactRank(right.estimatedImpact) - impactRank(left.estimatedImpact)
    || left.title.localeCompare(right.title)
  );
}

function dedupeDrafts(actions: OptimizationActionDraft[]) {
  const byKey = new Map<string, OptimizationActionDraft>();

  for (const action of actions) {
    const key = actionKey(action);
    const existing = byKey.get(key);
    if (!existing || compareActions(action, existing) < 0) {
      byKey.set(key, action);
    }
  }

  return [...byKey.values()].sort(compareActions);
}

function mapGapCategory(category: string): OptimizationActionCategory {
  if (category === 'review_platform') return 'review_platform';
  if (category === 'community') return 'community';
  if (category === 'directory') return 'directory';
  if (category === 'publisher') return 'pr_media';
  return 'content_distribution';
}

function priorityFromUrgency(urgency: number | null | undefined): OptimizationActionPriority {
  if ((urgency ?? 0) >= 4) return 'high';
  if ((urgency ?? 0) >= 2) return 'medium';
  return 'low';
}

function impactFromFix(fix: PrioritizedFix): OptimizationActionImpact {
  const score = Math.max(fix.estimatedLift ?? 0, fix.pointsAvailable ?? 0);
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function extractFixes(scoreResult: unknown): PrioritizedFix[] {
  if (!scoreResult || typeof scoreResult !== 'object') return [];
  const fixes = (scoreResult as { fixes?: unknown[] }).fixes;
  if (!Array.isArray(fixes)) return [];

  return fixes.filter((fix): fix is PrioritizedFix => {
    return Boolean(
      fix
      && typeof fix === 'object'
      && typeof (fix as PrioritizedFix).label === 'string'
      && typeof (fix as PrioritizedFix).detail === 'string'
      && typeof (fix as PrioritizedFix).instruction === 'string'
    );
  });
}

function rowToRecord(row: ActionRow): OptimizationActionRecord {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description ?? '',
    source: row.source,
    priority: row.priority,
    status: row.status,
    estimatedImpact: row.estimated_impact ?? 'medium',
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function previewFromDraft(action: OptimizationActionDraft): OptimizationActionRecord {
  return {
    ...action,
    id: null,
    status: 'pending',
    completedAt: null,
    createdAt: null,
    preview: true,
  };
}

function buildFallbackActions(): OptimizationActionDraft[] {
  return [
    {
      category: 'technical',
      title: 'Tighten your AI-readable site signals',
      description: 'Make llms.txt, schema markup, and answer-first page structure explicit on your priority pages.',
      source: 'best_practice',
      priority: 'high',
      estimatedImpact: 'high',
    },
    {
      category: 'content_distribution',
      title: 'Publish content for your highest-intent buyer questions',
      description: 'Turn your missed prompts into FAQ, comparison, or how-to content that AI engines can quote.',
      source: 'best_practice',
      priority: 'medium',
      estimatedImpact: 'high',
    },
    {
      category: 'directory',
      title: 'Audit third-party profiles and listings',
      description: 'Keep review sites, directories, and product listings accurate so outside sources reinforce your narrative.',
      source: 'best_practice',
      priority: 'medium',
      estimatedImpact: 'medium',
    },
  ];
}

export async function buildOptimizationActionDrafts(
  userId: string,
  domain: string,
  options?: { includeSourceGaps?: boolean },
): Promise<OptimizationActionDraft[]> {
  const includeSourceGaps = options?.includeSourceGaps ?? true;

  const [sourceAnalysis, latestScan, promptContext, opportunities] = await Promise.all([
    includeSourceGaps ? getSourceEcosystemAnalysis(userId, domain).catch(() => null) : Promise.resolve(null),
    getLatestCompletedScanForDomain(domain),
    getPromptContext(userId, domain),
    getContentOpportunities(userId, domain).catch(() => []),
  ]);

  const drafts: OptimizationActionDraft[] = [];

  for (const gap of sourceAnalysis?.gaps.slice(0, 6) ?? []) {
    drafts.push({
      category: mapGapCategory(gap.category),
      title: gap.actionTitle,
      description: gap.recommendation,
      source: 'gap_analysis',
      priority: gap.competitorCitations >= 4 ? 'high' : gap.competitorCitations >= 2 ? 'medium' : 'low',
      estimatedImpact: gap.competitorCitations >= 4 ? 'high' : 'medium',
    });
  }

  for (const fix of extractFixes(latestScan?.scoreResult).slice(0, 6)) {
    drafts.push({
      category: 'technical',
      title: fix.label,
      description: fix.instruction || fix.detail,
      source: 'scan_fix',
      priority: priorityFromUrgency(fix.urgency),
      estimatedImpact: impactFromFix(fix),
    });
  }

  const negativeByPrompt = new Map<string, { count: number; engines: string[] }>();
  for (const result of promptContext.latestResults) {
    const isNegative = result.sentimentLabel === 'negative' || result.descriptionAccuracy === 'inaccurate';
    if (!isNegative) continue;

    const existing = negativeByPrompt.get(result.promptId) ?? { count: 0, engines: [] };
    existing.count += 1;
    if (!existing.engines.includes(result.engine)) {
      existing.engines.push(result.engine);
    }
    negativeByPrompt.set(result.promptId, existing);
  }

  for (const [promptId, detail] of negativeByPrompt.entries()) {
    const prompt = promptContext.promptById.get(promptId);
    if (!prompt) continue;

    drafts.push({
      category: 'content_distribution',
      title: `Repair weak AI framing for "${prompt.promptText}"`,
      description: `Your brand is being described negatively or inaccurately on ${detail.engines.join(', ')}. Publish a stronger proof asset and seed it in channels AI engines already cite.`,
      source: 'prompt_insight',
      priority: detail.count >= 2 ? 'high' : 'medium',
      estimatedImpact: detail.count >= 2 ? 'high' : 'medium',
    });
  }

  const topOpportunity = opportunities[0];
  if (topOpportunity) {
    drafts.push({
      category: 'content_distribution',
      title: `Publish a ${topOpportunity.contentType.replace('_', ' ')} page for "${topOpportunity.promptText}"`,
      description: `This prompt is ${topOpportunity.reason}. A focused answer-first page can close that citation gap and give AI engines a better source to quote.`,
      source: 'best_practice',
      priority: topOpportunity.priorityScore >= 24 ? 'high' : 'medium',
      estimatedImpact: topOpportunity.priorityScore >= 18 ? 'high' : 'medium',
    });
  }

  const deduped = dedupeDrafts(drafts);
  return deduped.length > 0 ? deduped : buildFallbackActions();
}

export async function listStoredOptimizationActions(userId: string, domain: string): Promise<OptimizationActionRecord[]> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('optimization_actions')
      .select('id, category, title, description, source, priority, status, estimated_impact, completed_at, created_at')
      .eq('user_id', userId)
      .eq('domain', domain)
      .order('created_at', { ascending: false });

    return ((data ?? []) as ActionRow[])
      .map(rowToRecord)
      .sort((left, right) => compareActions(left, right) || left.title.localeCompare(right.title));
  } catch {
    return [];
  }
}

export async function refreshOptimizationActions(
  userId: string,
  domain: string,
  options?: { includeSourceGaps?: boolean },
): Promise<OptimizationActionRecord[]> {
  const supabase = getSupabaseClient();
  const drafts = await buildOptimizationActionDrafts(userId, domain, options);
  const existing = await listStoredOptimizationActions(userId, domain);

  const existingKeys = new Set(existing.map((action) => actionKey(action)));
  const draftKeys = new Set(drafts.map((action) => actionKey(action)));
  const inserts = drafts.filter((draft) => !existingKeys.has(actionKey(draft)));

  if (inserts.length > 0) {
    try {
      await supabase
        .from('optimization_actions')
        .upsert(
          inserts.map((action) => ({
            user_id: userId,
            domain,
            category: action.category,
            title: action.title,
            description: action.description,
            source: action.source,
            priority: action.priority,
            estimated_impact: action.estimatedImpact,
          })),
          { onConflict: 'user_id,domain,source,title', ignoreDuplicates: true },
        );
    } catch {
      return drafts.map(previewFromDraft);
    }
  }

  const stalePendingIds = existing
    .filter((action) => action.status === 'pending' && !draftKeys.has(actionKey(action)) && action.id)
    .map((action) => action.id as string);

  if (stalePendingIds.length > 0) {
    try {
      await supabase
        .from('optimization_actions')
        .update({ status: 'dismissed' })
        .in('id', stalePendingIds);
    } catch {
      // Non-blocking cleanup.
    }
  }

  const refreshed = await listStoredOptimizationActions(userId, domain);
  return refreshed.length > 0 ? refreshed : drafts.map(previewFromDraft);
}

export async function updateOptimizationActionStatus(
  userId: string,
  actionId: string,
  status: OptimizationActionStatus,
): Promise<OptimizationActionRecord | null> {
  const supabase = getSupabaseClient();
  const payload = {
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  };

  const { data } = await supabase
    .from('optimization_actions')
    .update(payload)
    .eq('id', actionId)
    .eq('user_id', userId)
    .select('id, category, title, description, source, priority, status, estimated_impact, completed_at, created_at')
    .maybeSingle();

  if (!data) return null;
  return rowToRecord(data as ActionRow);
}

export function buildActionPreviewRecords(actions: OptimizationActionDraft[]): OptimizationActionRecord[] {
  return actions.map(previewFromDraft).sort(compareActions);
}

export function computeActionProgress(actions: OptimizationActionRecord[]) {
  const active = actions.filter((action) => action.status !== 'dismissed');
  const completed = active.filter((action) => action.status === 'completed').length;
  return {
    completed,
    total: active.length,
    pct: active.length > 0 ? Math.round((completed / active.length) * 100) : 0,
  };
}
