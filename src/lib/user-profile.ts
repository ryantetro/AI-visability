import { getAccountAccessOverride } from '@/lib/account-access-overrides';
import { getSupabaseClient } from '@/lib/supabase';
import { type PlanTier, planStringToTier, PLANS } from '@/lib/pricing';

export interface UserProfile {
  id: string;
  email: string;
  plan: string;
  scans_used: number;
  free_scan_limit: number;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_schedule_id?: string | null;
  plan_expires_at: string | null;
  plan_cancel_at_period_end: boolean;
  pending_plan?: string | null;
  pending_plan_effective_at?: string | null;
  plan_updated_at: string | null;
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

function normalizeProfileEmail(email: string) {
  return email.trim().toLowerCase();
}

async function fetchProfileById(userId: string): Promise<UserProfile | null> {
  if (!userId) {
    return null;
  }

  const { data, error } = await getSupabaseClient()
    .from('user_profiles')
    .select()
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user profile by id: ${error.message}`);
  }

  return (data as UserProfile | null) ?? null;
}

async function fetchProfileByEmail(email: string): Promise<UserProfile | null> {
  if (!email) {
    return null;
  }

  const { data, error } = await getSupabaseClient()
    .from('user_profiles')
    .select()
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user profile by email: ${error.message}`);
  }

  return (data as UserProfile | null) ?? null;
}

async function syncProfileData(
  profile: UserProfile,
  options: { email: string; overridePlan?: string }
): Promise<UserProfile> {
  const nextEmail = options.email || profile.email;
  const nextPlan = options.overridePlan ?? profile.plan;
  if (profile.email === nextEmail && profile.plan === nextPlan) {
    return profile;
  }

  const { data, error } = await getSupabaseClient()
    .from('user_profiles')
    .update({
      email: nextEmail,
      plan: nextPlan,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update user profile: ${error?.message ?? 'No profile returned'}`);
  }

  return data as UserProfile;
}

async function rekeyProfileToAuthUser(
  profile: UserProfile,
  nextUserId: string,
  email: string,
  overridePlan?: string
): Promise<UserProfile | null> {
  const { data, error } = await getSupabaseClient()
    .from('user_profiles')
    .update({
      id: nextUserId,
      email,
      ...(overridePlan ? { plan: overridePlan } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .select()
    .single();

  if (error || !data) {
    console.warn('[user-profile] failed to rekey profile to auth user', {
      fromUserId: profile.id,
      toUserId: nextUserId,
      email,
      error: error?.message ?? 'No profile returned',
    });
    return null;
  }

  return data as UserProfile;
}

export async function getOrCreateProfile(userId: string, email: string): Promise<UserProfile> {
  const supabase = getSupabaseClient();
  const normalizedEmail = normalizeProfileEmail(email);
  const override = getAccountAccessOverride(normalizedEmail || email);

  const existingById = await fetchProfileById(userId);
  if (existingById) {
    return syncProfileData(existingById, {
      email: normalizedEmail || existingById.email,
      overridePlan: override?.plan,
    });
  }

  const existingByEmail = normalizedEmail ? await fetchProfileByEmail(normalizedEmail) : null;
  if (existingByEmail) {
    if (existingByEmail.id !== userId) {
      const rekeyed = await rekeyProfileToAuthUser(existingByEmail, userId, normalizedEmail, override?.plan);
      if (rekeyed) {
        return rekeyed;
      }
    }

    return syncProfileData(existingByEmail, {
      email: normalizedEmail,
      overridePlan: override?.plan,
    });
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert(
      { id: userId, email: normalizedEmail, ...(override?.plan ? { plan: override.plan } : {}) }
    )
    .select()
    .single();

  if (error || !data) {
    const fallbackById = await fetchProfileById(userId);
    if (fallbackById) {
      return syncProfileData(fallbackById, {
        email: normalizedEmail || fallbackById.email,
        overridePlan: override?.plan,
      });
    }

    const fallbackByEmail = normalizedEmail ? await fetchProfileByEmail(normalizedEmail) : null;
    if (fallbackByEmail) {
      if (fallbackByEmail.id !== userId) {
        const rekeyed = await rekeyProfileToAuthUser(fallbackByEmail, userId, normalizedEmail, override?.plan);
        if (rekeyed) {
          return rekeyed;
        }
      }

      return syncProfileData(fallbackByEmail, {
        email: normalizedEmail,
        overridePlan: override?.plan,
      });
    }

    throw new Error(`Failed to get or create user profile: ${error?.message || 'No profile returned'}`);
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

const VALID_PLANS = new Set(['free', 'starter_monthly', 'starter_annual', 'pro_monthly', 'pro_annual', 'growth_monthly', 'growth_annual', 'lifetime']);

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
