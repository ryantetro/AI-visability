import { AI_PLATFORMS, type AIPlatform, PLANS, type PlanTier } from '@/lib/pricing';
import type { AIEngine } from '@/types/ai-mentions';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Default platform priority order.
 * When a user hasn't explicitly chosen, they get the first N from this list.
 */
export const DEFAULT_PLATFORM_PRIORITY: AIPlatform[] = [
  'chatgpt',
  'perplexity',
  'gemini',
  'claude',
  'copilot',
  'grok',
];

/**
 * Map between our platform IDs and AIEngine IDs.
 * Currently the AI scan system only supports 4 engines (chatgpt, perplexity, gemini, claude).
 * copilot and grok are tracked for crawler/referral analytics but not yet for mention testing.
 */
const SCANNABLE_PLATFORMS: Set<string> = new Set(['chatgpt', 'perplexity', 'gemini', 'claude']);

/** Get the max platforms allowed for a tier */
export function getMaxPlatforms(tier: PlanTier): number {
  return PLANS[tier].platforms;
}

/** Get default platform selections for a tier (first N from priority list) */
export function getDefaultPlatforms(tier: PlanTier): AIPlatform[] {
  const max = getMaxPlatforms(tier);
  return DEFAULT_PLATFORM_PRIORITY.slice(0, max);
}

/**
 * Validate and clamp platform selections to the tier's limit.
 * Returns only valid platform IDs, capped at the tier's max.
 */
export function validatePlatformSelection(
  selected: string[],
  tier: PlanTier
): AIPlatform[] {
  const max = getMaxPlatforms(tier);
  const validPlatforms = new Set<string>(AI_PLATFORMS);

  const validated = selected
    .filter((p) => validPlatforms.has(p)) as AIPlatform[];

  // Deduplicate
  const unique = [...new Set(validated)];

  return unique.slice(0, max);
}

/**
 * Get the effective platforms for a domain (selected or default).
 * Filters to only scannable engines for AI mention testing.
 */
export function getScannableEngines(
  selectedPlatforms: AIPlatform[] | null,
  tier: PlanTier,
  availableEngines: AIEngine[]
): AIEngine[] {
  const platforms = selectedPlatforms ?? getDefaultPlatforms(tier);
  // Only include engines that are both selected AND available (have API keys)
  return availableEngines.filter(
    (engine) => platforms.includes(engine as AIPlatform) && SCANNABLE_PLATFORMS.has(engine)
  );
}

/** Fetch selected platforms for a user+domain from the database */
export async function getSelectedPlatforms(
  userId: string,
  domain: string
): Promise<AIPlatform[] | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('user_domains')
    .select('selected_platforms')
    .eq('user_id', userId)
    .eq('domain', domain)
    .single();

  if (!data?.selected_platforms) return null;
  return data.selected_platforms as AIPlatform[];
}

/** Save selected platforms for a user+domain */
export async function saveSelectedPlatforms(
  userId: string,
  domain: string,
  platforms: AIPlatform[]
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_domains')
    .update({
      selected_platforms: platforms,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('domain', domain);

  if (error) {
    throw new Error(`Failed to save platform selection: ${error.message}`);
  }
}
