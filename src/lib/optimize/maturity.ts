import { getSupabaseClient } from '@/lib/supabase';
import { getPromptContext } from '@/lib/optimize/shared';
import type { MaturityResult } from '@/lib/optimize/types';

const STAGE_LABELS: Record<MaturityResult['stage'], MaturityResult['label']> = {
  1: 'Unaware',
  2: 'Auditing',
  3: 'Optimizing',
  4: 'Operationalized',
};

export async function computeMaturity(userId: string, domain: string): Promise<MaturityResult> {
  const supabase = getSupabaseClient();
  const { prompts, latestResults } = await getPromptContext(userId, domain);

  const [
    selectedPlatformsCount,
    generatedContentCount,
    studioDraftCount,
    completedActionsCount,
    hasSourceAnalysis,
    hasBrandCheck,
  ] = await Promise.all([
    (async () => {
      const { data } = await supabase
        .from('user_domains')
        .select('selected_platforms')
        .eq('user_id', userId)
        .eq('domain', domain)
        .maybeSingle();

      return Array.isArray(data?.selected_platforms) ? data.selected_platforms.length : 0;
    })(),
    (async () => {
      const { count } = await supabase
        .from('generated_content_pages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('domain', domain);

      return count ?? 0;
    })(),
    (async () => {
      try {
        const { count } = await supabase
          .from('content_studio_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('domain', domain)
          .in('status', ['draft', 'published']);

        return count ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const { count } = await supabase
          .from('optimization_actions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('domain', domain)
          .eq('status', 'completed');

        return count ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const { data } = await supabase
          .from('source_ecosystem_cache')
          .select('id')
          .eq('user_id', userId)
          .eq('domain', domain)
          .maybeSingle();

        return Boolean(data?.id);
      } catch {
        return false;
      }
    })(),
    (async () => {
      try {
        const { data } = await supabase
          .from('brand_consistency_cache')
          .select('id')
          .eq('user_id', userId)
          .eq('domain', domain)
          .maybeSingle();

        return Boolean(data?.id);
      } catch {
        return false;
      }
    })(),
  ]);

  const promptCount = prompts.length;
  const platformCount = Math.max(selectedPlatformsCount, new Set(latestResults.map((result) => result.engine)).size);
  const contentCount = generatedContentCount + studioDraftCount;
  const completedActions = completedActionsCount;

  const criteria: MaturityResult['criteria'] = [
    { key: 'prompts_5', label: 'Track 5+ prompts', met: promptCount >= 5, stage: 2, tab: 'content' },
    { key: 'platforms_2', label: 'Monitor 2+ AI platforms', met: platformCount >= 2, stage: 2, tab: 'sources' },
    { key: 'content_1', label: 'Generate 1+ content piece', met: contentCount >= 1, stage: 3, tab: 'content' },
    { key: 'sources_viewed', label: 'Run source ecosystem analysis', met: hasSourceAnalysis, stage: 3, tab: 'sources' },
    { key: 'content_3', label: 'Create 3+ content pieces', met: contentCount >= 3, stage: 4, tab: 'content' },
    { key: 'brand_check', label: 'Run brand consistency check', met: hasBrandCheck, stage: 4, tab: 'brand' },
    { key: 'actions_5', label: 'Complete 5+ optimization actions', met: completedActions >= 5, stage: 4, tab: 'actions' },
    { key: 'platforms_3', label: 'Monitor 3+ AI platforms', met: platformCount >= 3, stage: 4, tab: 'sources' },
  ];

  const stage2Met = promptCount >= 5 && platformCount >= 2;
  const stage3Met = stage2Met && contentCount >= 1 && hasSourceAnalysis;
  const stage4Met = stage3Met && contentCount >= 3 && hasBrandCheck && completedActions >= 5 && platformCount >= 3;

  const stage: MaturityResult['stage'] = stage4Met ? 4 : stage3Met ? 3 : stage2Met ? 2 : 1;

  return {
    stage,
    label: STAGE_LABELS[stage],
    counts: {
      prompts: promptCount,
      platforms: platformCount,
      content: contentCount,
      completedActions,
    },
    criteria,
  };
}
