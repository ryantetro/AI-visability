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

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      { id: userId, email: email.toLowerCase() },
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

export function canUserScan(profile: UserProfile): boolean {
  // All users can scan (free users just can't access paid features)
  return true;
}

export function getUserUsage(profile: UserProfile): UserUsage {
  const tier = planStringToTier(profile.plan);
  const isPaid = tier !== 'free';
  const planConfig = PLANS[tier];
  return {
    used: profile.scans_used,
    limit: profile.free_scan_limit,
    remaining: Infinity,
    isPaid,
    plan: profile.plan,
    tier,
    domains: planConfig.domains,
    prompts: planConfig.prompts,
  };
}

export async function upgradeUserPlan(userId: string, plan: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to upgrade user plan: ${error.message}`);
  }
}
