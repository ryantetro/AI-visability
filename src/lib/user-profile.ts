import { getAccountAccessOverride } from '@/lib/account-access-overrides';
import { getSupabaseClient } from '@/lib/supabase';
import { type PlanTier, planStringToTier, PLANS } from '@/lib/pricing';

export interface UserProfile {
  id: string;
  email: string;
  plan: string;
  scans_used: number;
  free_scan_limit: number;
  created_at: string;
  updated_at: string;
}

export interface UserUsage {
  used: number;
  limit: number;
  remaining: number;
  isPaid: boolean;
  plan: string;
  tier: PlanTier;
  domains: number;
  prompts: number;
}

export async function getOrCreateProfile(userId: string, email: string): Promise<UserProfile> {
  const supabase = getSupabaseClient();
  const override = getAccountAccessOverride(email);

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      { id: userId, email: email.toLowerCase(), ...(override?.plan ? { plan: override.plan } : {}) },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error || !data) {
    // If upsert with ignoreDuplicates didn't return data, fetch existing
    const { data: existing, error: fetchError } = await supabase
      .from('user_profiles')
      .select()
      .eq('id', userId)
      .single();

    if (fetchError || !existing) {
      throw new Error(`Failed to get or create user profile: ${error?.message || fetchError?.message}`);
    }
    if (override?.plan && existing.plan !== override.plan) {
      const { data: updated, error: updateError } = await supabase
        .from('user_profiles')
        .update({ plan: override.plan, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (!updateError && updated) {
        return updated as UserProfile;
      }
    }
    return existing as UserProfile;
  }

  return data as UserProfile;
}

export async function incrementScanCount(userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.rpc('increment_scans_used', { user_id: userId });

  if (error) {
    // Fallback: read-then-write if RPC doesn't exist
    const { data } = await supabase
      .from('user_profiles')
      .select('scans_used')
      .eq('id', userId)
      .single();

    if (data) {
      await supabase
        .from('user_profiles')
        .update({ scans_used: data.scans_used + 1, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
  }
}

export function canUserScan(): boolean {
  // All users can scan (free users just can't access paid features)
  return true;
}

export function getUserUsage(profile: UserProfile): UserUsage {
  const override = getAccountAccessOverride(profile.email);
  const effectivePlan = override?.plan ?? profile.plan;
  const tier = override?.tier ?? planStringToTier(effectivePlan);
  const isPaid = tier !== 'free';
  const planConfig = PLANS[tier];
  return {
    used: profile.scans_used,
    limit: profile.free_scan_limit,
    remaining: Infinity,
    isPaid,
    plan: effectivePlan,
    tier,
    domains: override?.maxDomains ?? planConfig.domains,
    prompts: override?.maxPrompts ?? planConfig.prompts,
  };
}

const VALID_PLANS = new Set(['free', 'starter_monthly', 'starter_annual', 'pro_monthly', 'pro_annual', 'lifetime']);

export async function upgradeUserPlan(userId: string, plan: string): Promise<void> {
  if (!VALID_PLANS.has(plan)) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to upgrade user plan: ${error.message}`);
  }
}
