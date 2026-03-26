import { type PlanTier, planStringToTier, canAccess, PLANS, FEATURE_GATES } from '@/lib/pricing';
import { getAccountAccessOverride } from '@/lib/account-access-overrides';
import { getOrCreateProfile } from '@/lib/user-profile';
import { getTeamForUser } from '@/lib/team-management';
import { getSupabaseClient } from '@/lib/supabase';

export interface AccessInfo {
  tier: PlanTier;
  plan: string;
  isPaid: boolean;
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
}

export async function getUserAccess(userId: string, email: string): Promise<AccessInfo> {
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

  if (teamInfo && teamInfo.role === 'member') {
    // Resolve owner's profile via plain select (not upsert — we don't have their email here)
    const supabase = getSupabaseClient();
    const { data: ownerProfile } = await supabase
      .from('user_profiles')
      .select('plan, email')
      .eq('id', teamInfo.team.owner_id)
      .single();

    const ownerEmail = ownerProfile?.email ?? '';
    const ownerOverride = getAccountAccessOverride(ownerEmail);
    effectivePlan = ownerOverride?.plan ?? ownerProfile?.plan ?? 'free';
    tier = ownerOverride?.tier ?? planStringToTier(effectivePlan);
  } else {
    effectivePlan = override?.plan ?? profile.plan;
    tier = override?.tier ?? planStringToTier(effectivePlan);
  }

  const isPaid = tier !== 'free';
  const planConfig = PLANS[tier];

  return {
    tier,
    plan: effectivePlan,
    isPaid,
    canAccessFeature: (feature: string) => {
      const requiredTier = FEATURE_GATES[feature];
      if (!requiredTier) return true; // unknown feature = allow
      return canAccess(tier, requiredTier);
    },
    maxDomains: override?.maxDomains ?? planConfig.domains,
    maxPrompts: override?.maxPrompts ?? planConfig.prompts,
    maxPlatforms: planConfig.platforms,
    maxCompetitors: planConfig.competitors,
    maxRegions: planConfig.regions,
    maxSeats: planConfig.seats,
    maxContentPages: planConfig.contentPages,
    teamId,
    teamRole,
    teamName,
  };
}
