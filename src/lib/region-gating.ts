import { type PlanTier, PLANS } from '@/lib/pricing';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Supported regions for AI visibility testing.
 * Each region represents a geographic + language context that
 * affects how AI engines respond to prompts about a brand.
 */
export interface Region {
  id: string;
  label: string;
  flag: string;
  language: string;
  locale: string;
  /** System prompt hint appended when testing prompts for this region */
  contextHint: string;
}

export const REGIONS: Region[] = [
  {
    id: 'us-en',
    label: 'United States',
    flag: 'US',
    language: 'English',
    locale: 'en-US',
    contextHint: 'Answer as if the user is located in the United States.',
  },
  {
    id: 'gb-en',
    label: 'United Kingdom',
    flag: 'GB',
    language: 'English',
    locale: 'en-GB',
    contextHint: 'Answer as if the user is located in the United Kingdom.',
  },
  {
    id: 'ca-en',
    label: 'Canada',
    flag: 'CA',
    language: 'English',
    locale: 'en-CA',
    contextHint: 'Answer as if the user is located in Canada.',
  },
  {
    id: 'au-en',
    label: 'Australia',
    flag: 'AU',
    language: 'English',
    locale: 'en-AU',
    contextHint: 'Answer as if the user is located in Australia.',
  },
  {
    id: 'de-de',
    label: 'Germany',
    flag: 'DE',
    language: 'German',
    locale: 'de-DE',
    contextHint: 'Answer as if the user is located in Germany. Respond in German.',
  },
  {
    id: 'fr-fr',
    label: 'France',
    flag: 'FR',
    language: 'French',
    locale: 'fr-FR',
    contextHint: 'Answer as if the user is located in France. Respond in French.',
  },
  {
    id: 'es-es',
    label: 'Spain',
    flag: 'ES',
    language: 'Spanish',
    locale: 'es-ES',
    contextHint: 'Answer as if the user is located in Spain. Respond in Spanish.',
  },
  {
    id: 'br-pt',
    label: 'Brazil',
    flag: 'BR',
    language: 'Portuguese',
    locale: 'pt-BR',
    contextHint: 'Answer as if the user is located in Brazil. Respond in Portuguese.',
  },
  {
    id: 'jp-ja',
    label: 'Japan',
    flag: 'JP',
    language: 'Japanese',
    locale: 'ja-JP',
    contextHint: 'Answer as if the user is located in Japan. Respond in Japanese.',
  },
  {
    id: 'in-en',
    label: 'India',
    flag: 'IN',
    language: 'English',
    locale: 'en-IN',
    contextHint: 'Answer as if the user is located in India.',
  },
];

export const DEFAULT_REGION_ID = 'us-en';

export function getRegionById(id: string): Region | undefined {
  return REGIONS.find(r => r.id === id);
}

/** Get the default region(s) for a tier */
export function getDefaultRegions(tier: PlanTier): string[] {
  return [DEFAULT_REGION_ID];
}

/** Validate selected regions against plan limits */
export function validateRegionSelection(selected: string[], tier: PlanTier): string[] {
  const config = PLANS[tier];
  const maxRegions = config.regions === -1 ? Infinity : config.regions;
  const valid = selected.filter(id => REGIONS.some(r => r.id === id));

  if (valid.length === 0) return [DEFAULT_REGION_ID];
  if (valid.length > maxRegions) return valid.slice(0, maxRegions);
  return valid;
}

/**
 * Apply region context to a prompt text.
 * For the primary region (us-en), no modification is needed.
 * For other regions, append the region context hint.
 */
export function applyRegionContext(promptText: string, regionId: string): string {
  if (regionId === DEFAULT_REGION_ID) return promptText;
  const region = getRegionById(regionId);
  if (!region) return promptText;
  return `${promptText}\n\n[Context: ${region.contextHint}]`;
}

/**
 * Get the primary selected region for a domain, with fallback.
 */
export async function getPrimaryRegion(userId: string, domain: string): Promise<Region> {
  const selected = await getSelectedRegions(userId, domain);
  const primaryId = selected?.[0] ?? DEFAULT_REGION_ID;
  return getRegionById(primaryId) ?? REGIONS[0];
}

/** Fetch selected regions for a domain from DB */
export async function getSelectedRegions(userId: string, domain: string): Promise<string[] | null> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('user_domains')
      .select('selected_regions')
      .eq('user_id', userId)
      .eq('domain', domain)
      .single();

    return (data?.selected_regions as string[] | null) ?? null;
  } catch {
    return null;
  }
}

/** Save selected regions for a domain to DB */
export async function saveSelectedRegions(userId: string, domain: string, regions: string[]): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('user_domains')
    .update({ selected_regions: regions, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('domain', domain);

  if (error) {
    // Row may not exist yet - try upsert
    const { error: upsertError } = await supabase
      .from('user_domains')
      .upsert(
        { user_id: userId, domain, selected_regions: regions, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,domain' }
      );
    if (upsertError) throw new Error(`Failed to save regions: ${upsertError.message}`);
  }
}
