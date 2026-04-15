import { type PlanTier, planStringToTier, canAccess, PLANS, FEATURE_GATES } from '@/lib/pricing';
import { getAccountAccessOverride } from '@/lib/account-access-overrides';
import { getOrCreateProfile } from '@/lib/user-profile';
import { getTeamForUser } from '@/lib/team-management';
import { getSupabaseClient } from '@/lib/supabase';

export interface AccessInfo {
  tier: PlanTier;
  plan: string;
  isPaid: boolean;
  scansUsed: number;
  freeScanLimit: number;
  canAccessFeature: (feature: string) => boolean;
  maxDomains: number;
  maxPrompts: number;
  maxPlatforms: number;
  maxCompetitors: number;
  maxRegions: number;
  maxSeats: number;
  maxContentPages: number;
  teamId: string | null;
  teamRole: 'owner' | 'member' | null;
  teamName: string | null;
  planExpiresAt: string | null;
  planCancelAtPeriodEnd: boolean;
}

const ACCESS_CACHE_TTL_MS = 5_000;
const accessInfoCache = new Map<string, { value: AccessInfo; cachedAt: number }>();
const accessInfoInflight = new Map<string, Promise<AccessInfo>>();

export async function getUserAccess(userId: string, email: string): Promise<AccessInfo> {
  const cacheKey = `${userId}:${email.trim().toLowerCase()}`;
  const cached = accessInfoCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < ACCESS_CACHE_TTL_MS) {
    return cached.value;
  }

  const inFlight = accessInfoInflight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const profile = await getOrCreateProfile(userId, email);
    const override = getAccountAccessOverride(email);

    // Check if user is in a team
    const teamInfo = await getTeamForUser(userId);
    const teamId = teamInfo?.team.id ?? null;
    const teamRole = teamInfo?.role ?? null;
    const teamName = teamInfo?.team.name ?? null;

    // If user is a team member (not owner), use the team owner's plan
    let effectivePlan: string;
    let tier: PlanTier;
    let planExpiresAt: string | null;
    let planCancelAtPeriodEnd = false;
    let effectiveOverride = override;

    if (teamInfo && teamInfo.role === 'member') {
      // Resolve owner's profile via plain select (not upsert — we don't have their email here)
      const supabase = getSupabaseClient();
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('plan, email, plan_expires_at, plan_cancel_at_period_end')
        .eq('id', teamInfo.team.owner_id)
        .single();

      const ownerEmail = ownerProfile?.email ?? '';
      const ownerOverride = getAccountAccessOverride(ownerEmail);
      effectiveOverride = ownerOverride;
      effectivePlan = ownerOverride?.plan ?? ownerProfile?.plan ?? 'free';
      tier = ownerOverride?.tier ?? planStringToTier(effectivePlan);
      planExpiresAt = ownerProfile?.plan_expires_at ?? null;
      planCancelAtPeriodEnd = ownerProfile?.plan_cancel_at_period_end ?? false;
    } else {
      effectivePlan = override?.plan ?? profile.plan;
      tier = override?.tier ?? planStringToTier(effectivePlan);
      planExpiresAt = profile.plan_expires_at ?? null;
      planCancelAtPeriodEnd = profile.plan_cancel_at_period_end ?? false;
    }

    const isPaid = tier !== 'free';
    const planConfig = PLANS[tier];

    const value: AccessInfo = {
      tier,
      plan: effectivePlan,
      isPaid,
      scansUsed: profile.scans_used,
      freeScanLimit: profile.free_scan_limit,
      canAccessFeature: (feature: string) => {
        const requiredTier = FEATURE_GATES[feature];
        if (!requiredTier) return true; // unknown feature = allow
        return canAccess(tier, requiredTier);
      },
      maxDomains: effectiveOverride?.maxDomains ?? planConfig.domains,
      maxPrompts: effectiveOverride?.maxPrompts ?? planConfig.prompts,
      maxPlatforms: planConfig.platforms,
      maxCompetitors: planConfig.competitors,
      maxRegions: planConfig.regions,
      maxSeats: planConfig.seats,
      maxContentPages: planConfig.contentPages,
      teamId,
      teamRole,
      teamName,
      planExpiresAt,
      planCancelAtPeriodEnd,
    };

    accessInfoCache.set(cacheKey, { value, cachedAt: Date.now() });
    return value;
  })().finally(() => {
    accessInfoInflight.delete(cacheKey);
  });

  accessInfoInflight.set(cacheKey, request);
  return request;
}
